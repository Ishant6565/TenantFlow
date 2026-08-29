import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/security/auth';
import { getTenantContext, TenantDatabase } from '@/lib/security/tenant';
import { hasPermission } from '@/lib/security/rbac';
import { CreateProjectSchema, sanitizeString } from '@/lib/security/validation';
import { checkQuota, recordUsage } from '@/lib/billing-plans';
import { logAuditEvent } from '@/lib/security/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getTenantContext(orgSlug, user.id);
    if (!tenant) return NextResponse.json({ error: 'Forbidden: Tenant isolation mismatch' }, { status: 403 });

    // Strict row-level isolation query
    const tenantDb = new TenantDatabase(tenant.organization.id);
    const projects = await tenantDb.listProjects();

    const quota = await checkQuota(tenant.organization.id, 'projects', 0);

    return NextResponse.json({
      projects,
      quota,
      currentUserRole: tenant.membership.role,
    });
  } catch (error) {
    console.error('[PROJECTS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getTenantContext(orgSlug, user.id);
    if (!tenant) return NextResponse.json({ error: 'Forbidden: Tenant isolation mismatch' }, { status: 403 });

    // RBAC check
    if (!hasPermission(tenant.membership.role, 'project:create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create projects' }, { status: 403 });
    }

    // Quota check
    const quota = await checkQuota(tenant.organization.id, 'projects', 1);
    if (!quota.allowed) {
      await logAuditEvent({
        organizationId: tenant.organization.id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'QUOTA_EXCEEDED',
        resourceType: 'PROJECT',
        metadata: { current: quota.current, max: quota.max, plan: quota.plan },
        req,
      });

      return NextResponse.json(
        {
          error: `Project limit reached (${quota.current}/${quota.max}) for ${quota.plan} plan. Upgrade to unlock more projects.`,
          quotaExceeded: true,
        },
        { status: 403 }
      );
    }

    // Input validation & sanitization
    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { name, description } = parsed.data;
    const sanitizedName = sanitizeString(name);
    const sanitizedDesc = description ? sanitizeString(description) : null;

    const tenantDb = new TenantDatabase(tenant.organization.id);
    const project = await tenantDb.createProject({
      name: sanitizedName,
      description: sanitizedDesc || undefined,
      createdById: user.id,
    });

    // Record usage
    await recordUsage(tenant.organization.id, 'projects_created', 1);

    await logAuditEvent({
      organizationId: tenant.organization.id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PROJECT_CREATED',
      resourceType: 'PROJECT',
      resourceId: project.id,
      metadata: { name: project.name },
      req,
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('[PROJECTS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
