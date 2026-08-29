import { prisma } from '../db';
import { Membership } from '@prisma/client';

export interface TenantContext {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscriptionStatus: string;
  };
  membership: {
    id: string;
    role: string;
    userId: string;
  };
}

/**
 * Resolves organization and verifies that the requesting user is a legitimate member.
 * Throws an explicit error or returns null to prevent cross-tenant data leakage / IDOR.
 */
export async function getTenantContext(
  orgSlugOrId: string,
  userId: string
): Promise<TenantContext | null> {
  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ id: orgSlugOrId }, { slug: orgSlugOrId }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      subscriptionStatus: true,
    },
  });

  if (!org) return null;

  // Enforce tenant boundary: Check user membership inside this organization
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: org.id,
      },
    },
    select: {
      id: true,
      role: true,
      userId: true,
    },
  });

  if (!membership) return null;

  return {
    organization: org,
    membership,
  };
}

/**
 * Helper to get all organizations a user belongs to.
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          subscriptionStatus: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
  }));
}

/**
 * Tenant-Scoped Database Query Wrapper.
 * Prevents developers from accidentally querying across tenant boundaries without organizationId.
 */
export class TenantDatabase {
  private organizationId: string;

  constructor(organizationId: string) {
    if (!organizationId) {
      throw new Error('SECURITY VIOLATION: TenantDatabase initialized without organizationId.');
    }
    this.organizationId = organizationId;
  }

  // Tenant Projects
  async listProjects() {
    return prisma.tenantProject.findMany({
      where: { organizationId: this.organizationId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProject(data: { name: string; description?: string; createdById: string }) {
    return prisma.tenantProject.create({
      data: {
        ...data,
        organizationId: this.organizationId,
      },
    });
  }

  async deleteProject(projectId: string) {
    // Row-level security: check both projectId AND organizationId
    return prisma.tenantProject.deleteMany({
      where: {
        id: projectId,
        organizationId: this.organizationId,
      },
    });
  }

  // Members & Invites
  async listMembers() {
    return prisma.membership.findMany({
      where: { organizationId: this.organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
        },
      },
      orderBy: { role: 'asc' },
    });
  }

  async listInvites() {
    return prisma.invitation.findMany({
      where: {
        organizationId: this.organizationId,
        status: 'PENDING',
      },
      include: {
        inviter: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Audit Logs
  async listAuditLogs(limit = 50) {
    return prisma.auditLog.findMany({
      where: { organizationId: this.organizationId },
      include: {
        actor: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
