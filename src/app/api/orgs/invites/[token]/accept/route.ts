import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/security/auth';
import { logAuditEvent } from '@/lib/security/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invite = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, plan: true },
        },
        inviter: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or non-existent invitation token.' }, { status: 404 });
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json({ error: `Invitation has already been ${invite.status.toLowerCase()}.` }, { status: 400 });
    }

    if (new Date() > invite.expiresAt) {
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'This invitation has expired. Please ask for a new invite.' }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        organization: invite.organization,
        inviter: invite.inviter,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('[INVITE_VERIFY_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in or register before accepting an invitation.' }, { status: 401 });
    }

    const invite = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite || invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitation is no longer valid.' }, { status: 400 });
    }

    if (new Date() > invite.expiresAt) {
      await prisma.invitation.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      return NextResponse.json({ error: 'Invitation expired.' }, { status: 410 });
    }

    // Execute within a transaction: update invite and create membership
    const result = await prisma.$transaction(async (tx) => {
      // Upsert membership
      const membership = await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invite.organizationId,
          },
        },
        update: { role: invite.role },
        create: {
          userId: user.id,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });

      // Mark invite as ACCEPTED
      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });

      return membership;
    });

    await logAuditEvent({
      organizationId: invite.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'INVITE_ACCEPTED',
      resourceType: 'MEMBERSHIP',
      resourceId: result.id,
      metadata: { role: invite.role, userEmail: user.email },
      req,
    });

    return NextResponse.json({
      success: true,
      organizationSlug: invite.organization.slug,
      message: `Successfully joined ${invite.organization.name} as ${invite.role}!`,
    });
  } catch (error) {
    console.error('[INVITE_ACCEPT_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
