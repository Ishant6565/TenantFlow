import { prisma } from './db';

export interface PlanConfig {
  id: 'FREE' | 'PRO' | 'ENTERPRISE';
  name: string;
  price: number;
  description: string;
  limits: {
    maxProjects: number;
    maxMembers: number;
    monthlyApiRequests: number;
  };
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Starter (Free)',
    price: 0,
    description: 'Perfect for small side projects and exploratory teams.',
    limits: {
      maxProjects: 3,
      maxMembers: 2,
      monthlyApiRequests: 1000,
    },
    features: [
      'Up to 3 Projects',
      '2 Team Members',
      '1,000 API Requests / mo',
      'Standard Multi-Tenant Isolation',
      'Basic RBAC Roles',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Growth (Pro)',
    price: 29,
    description: 'For growing businesses requiring team collaboration and auditability.',
    limits: {
      maxProjects: 25,
      maxMembers: 10,
      monthlyApiRequests: 50000,
    },
    features: [
      'Up to 25 Projects',
      '10 Team Members',
      '50,000 API Requests / mo',
      'Immutable Security Audit Logs',
      'Expiring Signed Invites',
      'Priority Webhook Ingestion',
    ],
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 199,
    description: 'Mission-critical scalability with unlimited quotas and custom roles.',
    limits: {
      maxProjects: 9999,
      maxMembers: 9999,
      monthlyApiRequests: 500000,
    },
    features: [
      'Unlimited Projects & Members',
      '500,000 API Requests / mo',
      'Real-time Security Webhooks',
      'Custom Role Definitions',
      'Dedicated SLA & Export Tools',
    ],
  },
};

/**
 * Checks whether an organization is allowed to perform an action based on their subscription tier quota.
 */
export async function checkQuota(
  organizationId: string,
  metric: 'projects' | 'members' | 'api_requests',
  increment = 1
): Promise<{ allowed: boolean; current: number; max: number; plan: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });

  const planKey = org?.plan?.toUpperCase() || 'FREE';
  const plan = PLANS[planKey] || PLANS.FREE;

  if (metric === 'projects') {
    const count = await prisma.tenantProject.count({
      where: { organizationId },
    });
    return {
      allowed: count + increment <= plan.limits.maxProjects,
      current: count,
      max: plan.limits.maxProjects,
      plan: plan.name,
    };
  }

  if (metric === 'members') {
    const count = await prisma.membership.count({
      where: { organizationId },
    });
    return {
      allowed: count + increment <= plan.limits.maxMembers,
      current: count,
      max: plan.limits.maxMembers,
      plan: plan.name,
    };
  }

  // API Requests
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const usage = await prisma.usageRecord.findFirst({
    where: {
      organizationId,
      metricKey: 'api_requests',
      periodStart: { gte: startOfMonth },
    },
  });

  const currentUsage = usage?.count || 0;
  return {
    allowed: currentUsage + increment <= plan.limits.monthlyApiRequests,
    current: currentUsage,
    max: plan.limits.monthlyApiRequests,
    plan: plan.name,
  };
}

/**
 * Increments metered usage counter for an organization.
 */
export async function recordUsage(
  organizationId: string,
  metricKey: string,
  units = 1
): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const record = await prisma.usageRecord.upsert({
    where: {
      organizationId_metricKey_periodStart: {
        organizationId,
        metricKey,
        periodStart: startOfMonth,
      },
    },
    update: {
      count: { increment: units },
      updatedAt: now,
    },
    create: {
      organizationId,
      metricKey,
      count: units,
      periodStart: startOfMonth,
      periodEnd: endOfMonth,
    },
  });

  return record.count;
}
