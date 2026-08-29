import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/security/auth';
import { getTenantContext, TenantDatabase } from '@/lib/security/tenant';
import { hasPermission } from '@/lib/security/rbac';
import { InviteMemberSchema } from '@/lib/security/validation';
import { checkQuota } from '@/lib/billing-plans';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
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
    if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantDb = new TenantDatabase(tenant.organization.id);
    const invites = await tenantDb.listInvites();

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('[INVITES_GET_ERROR]', error);
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
    if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 1. RBAC check
    if (!hasPermission(tenant.membership.role, 'member:invite')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to invite members' }, { status: 403 });
    }

    // 2. Rate limiting (Prompt 5: Abuse & bot protection)
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`invite:${tenant.organization.id}:${ip}`, { maxRequests: 10, windowMs: 60000 });
    if (!rateLimit.success) {
      return NextResponse.json({ error: `Invite rate limit reached. Retry in ${rateLimit.resetInSeconds}s.` }, { status: 429 });
    }

    // 3. Input validation (Prompt 4)
    const body = await req.json();
    const parsed = InviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid invite data' }, { status: 400 });
    }

    const { email, role } = parsed.data;

    // 4. Check quota limits for current plan tier
    const quota = await checkQuota(tenant.organization.id, 'members');
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Member quota limit reached (${quota.current}/${quota.max}) for plan ${quota.plan}. Please upgrade your subscription.`,
          quotaExceeded: true,
        },
        { status: 403 }
      );
    }

    // 5. Check if user is already a member
    const existingMember = await prisma.membership.findFirst({
      where: {
        organizationId: tenant.organization.id,
        user: { email },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this organization.' }, { status: 409 });
    }

    // 6. Generate cryptographically secure signed invite token (48-hour expiration)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Invalidate prior pending invites to this email
    await prisma.invitation.updateMany({
      where: {
        organizationId: tenant.organization.id,
        email,
        status: 'PENDING',
      },
      data: { status: 'REVOKED' },
    });

    const invitation = await prisma.invitation.create({
      data: {
        email,
        organizationId: tenant.organization.id,
        role,
        token,
        inviterId: user.id,
        expiresAt,
        status: 'PENDING',
      },
    });

    await logAuditEvent({
      organizationId: tenant.organization.id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'MEMBER_INVITED',
      resourceType: 'INVITATION',
      resourceId: invitation.id,
      metadata: { invitedEmail: email, role, expiresAt: expiresAt.toISOString() },
      req,
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${token}`;

    return NextResponse.json({
      success: true,
      invitation,
      inviteUrl,
      message: `Invitation generated successfully for ${email}.`,
    });
  } catch (error) {
    console.error('[INVITES_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
