import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/security/auth';
import { getTenantContext, TenantDatabase } from '@/lib/security/tenant';
import { hasPermission } from '@/lib/security/rbac';
import { logAuditEvent } from '@/lib/security/audit';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  try {
    const { orgSlug, projectId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getTenantContext(orgSlug, user.id);
    if (!tenant) return NextResponse.json({ error: 'Forbidden: Tenant isolation mismatch' }, { status: 403 });

    // RBAC check
    if (!hasPermission(tenant.membership.role, 'project:delete')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete projects' }, { status: 403 });
    }

    const tenantDb = new TenantDatabase(tenant.organization.id);
    const deleteResult = await tenantDb.deleteProject(projectId);

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Project not found in this organization' }, { status: 404 });
    }

    await logAuditEvent({
      organizationId: tenant.organization.id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PROJECT_DELETED',
      resourceType: 'PROJECT',
      resourceId: projectId,
      req,
    });

    return NextResponse.json({ success: true, count: deleteResult.count });
  } catch (error) {
    console.error('[PROJECT_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
