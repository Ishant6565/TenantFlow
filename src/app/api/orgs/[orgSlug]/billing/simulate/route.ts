import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/security/auth';
import { getTenantContext } from '@/lib/security/tenant';
import { hasPermission } from '@/lib/security/rbac';
import { ChangePlanSchema } from '@/lib/security/validation';
import { executeIdempotently } from '@/lib/idempotency';
import { prisma } from '@/lib/db';
import { logAuditEvent } from '@/lib/security/audit';

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

    // RBAC check: Only OWNER / ADMIN can manage billing
    if (!hasPermission(tenant.membership.role, 'billing:manage')) {
      return NextResponse.json({ error: 'Forbidden: Only Organization Owners can modify billing plans.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ChangePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid plan' }, { status: 400 });
    }

    const { plan } = parsed.data;
    const isDowngrade = plan === 'FREE' && tenant.organization.plan !== 'FREE';
    const isUpgrade = !isDowngrade && plan !== tenant.organization.plan;

    // Simulate an external Stripe Webhook Event ID
    const simulatedEventId = body.simulatedEventId || `evt_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Run through the Idempotency Engine
    const { isDuplicate, data } = await executeIdempotently(
      simulatedEventId,
      `billing_plan_change:${plan}`,
      tenant.organization.id,
      async () => {
        const updatedOrg = await prisma.organization.update({
          where: { id: tenant.organization.id },
          data: {
            plan,
            subscriptionStatus: plan === 'FREE' ? 'ACTIVE' : 'ACTIVE',
            currentPeriodEnd: plan === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        await logAuditEvent({
          organizationId: tenant.organization.id,
          actorId: user.id,
          actorEmail: user.email,
          action: isUpgrade ? 'PLAN_UPGRADED' : 'PLAN_DOWNGRADED',
          resourceType: 'SUBSCRIPTION',
          metadata: {
            previousPlan: tenant.organization.plan,
            newPlan: plan,
            simulatedEventId,
          },
          req,
        });

        return {
          plan: updatedOrg.plan,
          status: updatedOrg.subscriptionStatus,
          simulatedEventId,
        };
      }
    );

    return NextResponse.json({
      success: true,
      duplicateDetected: isDuplicate,
      data,
      message: isDuplicate
        ? `Duplicate Webhook/Request Detected! Returned cached state for ${simulatedEventId} without re-processing.`
        : `Successfully updated subscription plan to ${plan}!`,
    });
  } catch (error) {
    console.error('[BILLING_SIMULATE_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
