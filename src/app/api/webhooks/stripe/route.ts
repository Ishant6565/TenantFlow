import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { executeIdempotently } from '@/lib/idempotency';
import { logAuditEvent } from '@/lib/security/audit';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') || req.headers.get('x-webhook-signature');

    // Parse payload
    let event: {
      id: string;
      type: string;
      data: {
        object: {
          id?: string;
          customer?: string;
          subscription?: string;
          organizationId?: string;
          plan?: string;
          status?: string;
          amount_paid?: number;
        };
      };
    };

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    if (!event.id || !event.type) {
      return NextResponse.json({ error: 'Missing required event id or type' }, { status: 400 });
    }

    const eventObj = event.data?.object || {};
    const targetOrgId = eventObj.organizationId;

    // Idempotent Execution: Guarantees exactly-once processing even if gateway retries 3+ times
    const { isDuplicate, data } = await executeIdempotently(
      event.id,
      `stripe_webhook:${event.type}`,
      targetOrgId,
      async () => {
        console.log(`[WEBHOOK_EXECUTE] Processing new event ${event.id} of type ${event.type}`);

        switch (event.type) {
          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const plan = (eventObj.plan || 'PRO').toUpperCase();
            const status = eventObj.status || 'ACTIVE';

            if (targetOrgId) {
              await prisma.organization.update({
                where: { id: targetOrgId },
                data: {
                  plan,
                  subscriptionStatus: status,
                  stripeSubscriptionId: eventObj.id || eventObj.subscription || `sub_${Date.now()}`,
                  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                },
              });

              await logAuditEvent({
                organizationId: targetOrgId,
                actorEmail: 'stripe_webhook@system.internal',
                action: 'PLAN_UPGRADED',
                resourceType: 'SUBSCRIPTION',
                resourceId: eventObj.id,
                metadata: { eventId: event.id, newPlan: plan, status },
                req,
              });
            }
            break;
          }

          case 'customer.subscription.deleted': {
            if (targetOrgId) {
              await prisma.organization.update({
                where: { id: targetOrgId },
                data: {
                  plan: 'FREE',
                  subscriptionStatus: 'CANCELED',
                },
              });

              await logAuditEvent({
                organizationId: targetOrgId,
                actorEmail: 'stripe_webhook@system.internal',
                action: 'PLAN_DOWNGRADED',
                resourceType: 'SUBSCRIPTION',
                resourceId: eventObj.id,
                metadata: { eventId: event.id, newPlan: 'FREE', reason: 'subscription_deleted' },
                req,
              });
            }
            break;
          }

          case 'invoice.payment_succeeded': {
            if (targetOrgId) {
              await logAuditEvent({
                organizationId: targetOrgId,
                actorEmail: 'stripe_webhook@system.internal',
                action: 'WEBHOOK_PROCESSED',
                resourceType: 'WEBHOOK',
                resourceId: event.id,
                metadata: { eventId: event.id, amountPaid: eventObj.amount_paid },
                req,
              });
            }
            break;
          }

          default:
            console.log(`[WEBHOOK_UNHANDLED] Event type ${event.type} ignored`);
        }

        return {
          processedAt: new Date().toISOString(),
          eventId: event.id,
          type: event.type,
          organizationId: targetOrgId,
        };
      }
    );

    return NextResponse.json({
      received: true,
      duplicateDelivery: isDuplicate,
      data,
    });
  } catch (error: any) {
    console.error('[STRIPE_WEBHOOK_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
