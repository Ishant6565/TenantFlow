import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/security/auth';
import { getTenantContext } from '@/lib/security/tenant';
import { checkQuota, recordUsage, PLANS } from '@/lib/billing-plans';
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

    const projectQuota = await checkQuota(tenant.organization.id, 'projects', 0);
    const memberQuota = await checkQuota(tenant.organization.id, 'members', 0);
    const apiQuota = await checkQuota(tenant.organization.id, 'api_requests', 0);

    const planConfig = PLANS[tenant.organization.plan] || PLANS.FREE;

    return NextResponse.json({
      plan: planConfig,
      quotas: {
        projects: projectQuota,
        members: memberQuota,
        apiRequests: apiQuota,
      },
    });
  } catch (error) {
    console.error('[USAGE_GET_ERROR]', error);
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

    const body = await req.json().catch(() => ({ units: 10 }));
    const units = Math.max(1, Math.min(Number(body.units) || 10, 500));

    // Check Quota
    const quota = await checkQuota(tenant.organization.id, 'api_requests', units);
    if (!quota.allowed) {
      await logAuditEvent({
        organizationId: tenant.organization.id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'QUOTA_EXCEEDED',
        resourceType: 'SUBSCRIPTION',
        metadata: { current: quota.current, requested: units, max: quota.max, plan: quota.plan },
        req,
      });

      return NextResponse.json(
        {
          error: `Monthly API request limit exceeded (${quota.current + units}/${quota.max}) for ${quota.plan} plan. Upgrade to increase capacity.`,
          quotaExceeded: true,
          quota,
        },
        { status: 429 }
      );
    }

    // Atomically increment metered usage
    const newCount = await recordUsage(tenant.organization.id, 'api_requests', units);

    return NextResponse.json({
      success: true,
      unitsAdded: units,
      totalCount: newCount,
      quota: {
        current: newCount,
        max: quota.max,
        plan: quota.plan,
        allowed: true,
      },
    });
  } catch (error) {
    console.error('[USAGE_METER_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
