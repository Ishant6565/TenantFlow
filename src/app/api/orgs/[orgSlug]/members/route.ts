import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/security/auth';
import { getTenantContext, TenantDatabase } from '@/lib/security/tenant';
import { hasPermission } from '@/lib/security/rbac';
import { UpdateRoleSchema } from '@/lib/security/validation';
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
    if (!tenant) return NextResponse.json({ error: 'Forbidden: Not a member of this organization' }, { status: 403 });

    const tenantDb = new TenantDatabase(tenant.organization.id);
    const members = await tenantDb.listMembers();

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
      })),
      currentUserRole: tenant.membership.role,
    });
  } catch (error) {
    console.error('[MEMBERS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getTenantContext(orgSlug, user.id);
    if (!tenant) return NextResponse.json({ error: 'Forbidden: Tenant isolation mismatch' }, { status: 403 });

    // RBAC Check: Ensure actor has permission to update roles
    if (!hasPermission(tenant.membership.role, 'member:update_role')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to modify roles' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { membershipId, role } = parsed.data;

    // Verify membership belongs to this organization (IDOR protection)
    const target = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: tenant.organization.id,
      },
      include: { user: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
    }

    // Protect last OWNER from being demoted
    if (target.role === 'OWNER' && role !== 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: { organizationId: tenant.organization.id, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot demote the sole organization owner.' }, { status: 400 });
      }
    }

    const updated = await prisma.membership.update({
      where: { id: target.id },
      data: { role },
    });

    await logAuditEvent({
      organizationId: tenant.organization.id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'ROLE_UPDATED',
      resourceType: 'MEMBERSHIP',
      resourceId: updated.id,
      metadata: { targetUserEmail: target.user.email, oldRole: target.role, newRole: role },
      req,
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error('[MEMBERS_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getTenantContext(orgSlug, user.id);
    if (!tenant) return NextResponse.json({ error: 'Forbidden: Tenant isolation mismatch' }, { status: 403 });

    if (!hasPermission(tenant.membership.role, 'member:remove')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to remove members' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const membershipId = searchParams.get('membershipId');
    if (!membershipId) return NextResponse.json({ error: 'Missing membershipId' }, { status: 400 });

    const target = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: tenant.organization.id,
      },
      include: { user: true },
    });

    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (target.role === 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: { organizationId: tenant.organization.id, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the sole organization owner.' }, { status: 400 });
      }
    }

    await prisma.membership.delete({ where: { id: target.id } });

    await logAuditEvent({
      organizationId: tenant.organization.id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'MEMBER_REMOVED',
      resourceType: 'MEMBERSHIP',
      resourceId: target.id,
      metadata: { targetUserEmail: target.user.email, removedRole: target.role },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MEMBERS_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
