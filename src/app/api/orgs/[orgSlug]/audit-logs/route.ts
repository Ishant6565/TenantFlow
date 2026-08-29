import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/security/auth';
import { getTenantContext, TenantDatabase } from '@/lib/security/tenant';
import { hasPermission } from '@/lib/security/rbac';

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

    // RBAC check
    if (!hasPermission(tenant.membership.role, 'audit:read')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view security audit logs' }, { status: 403 });
    }

    const tenantDb = new TenantDatabase(tenant.organization.id);
    const logs = await tenantDb.listAuditLogs(100);

    return NextResponse.json({
      auditLogs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
        actor: l.actor ? { name: l.actor.name, email: l.actor.email } : { name: 'System / Webhook', email: l.actorEmail },
        ipAddress: l.ipAddress || '127.0.0.1',
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error('[AUDIT_LOGS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
