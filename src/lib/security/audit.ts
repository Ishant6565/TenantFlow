import { prisma } from '../db';
import { getClientIp } from './rate-limit';

export interface AuditEventParams {
  organizationId: string;
  actorId?: string | null;
  actorEmail?: string | null;
  action:
    | 'ORG_CREATED'
    | 'MEMBER_INVITED'
    | 'INVITE_ACCEPTED'
    | 'ROLE_UPDATED'
    | 'MEMBER_REMOVED'
    | 'PLAN_UPGRADED'
    | 'PLAN_DOWNGRADED'
    | 'WEBHOOK_PROCESSED'
    | 'PROJECT_CREATED'
    | 'PROJECT_DELETED'
    | 'QUOTA_EXCEEDED';
  resourceType: 'ORGANIZATION' | 'MEMBERSHIP' | 'SUBSCRIPTION' | 'PROJECT' | 'WEBHOOK' | 'INVITATION';
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Creates an immutable audit log entry for security and compliance tracking.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (params.req) {
      ipAddress = getClientIp(params.req);
      userAgent = params.req.headers.get('user-agent');
    }

    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId || null,
        actorEmail: params.actorEmail || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Non-blocking catch to ensure core transactions don't fail if audit logging hits an error
    console.error('[AUDIT_LOG_ERROR]', error);
  }
}
