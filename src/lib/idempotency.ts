import { prisma } from './db';

export interface IdempotentResult<T> {
  isDuplicate: boolean;
  data: T;
}

/**
 * Idempotent execution wrapper.
 * Prevents double billing, duplicate memberships, and ghost upgrades during payment gateway retries.
 */
export async function executeIdempotently<T>(
  idempotencyKey: string,
  action: string,
  organizationId: string | undefined,
  handler: () => Promise<T>
): Promise<IdempotentResult<T>> {
  // Check if this idempotency key already exists
  const existing = await prisma.idempotencyKey.findUnique({
    where: { id: idempotencyKey },
  });

  if (existing) {
    if (existing.status === 'COMPLETED' && existing.responsePayload) {
      // Safely return cached outcome without re-executing
      return {
        isDuplicate: true,
        data: JSON.parse(existing.responsePayload) as T,
      };
    }

    if (existing.status === 'PROCESSING') {
      throw new Error(
        `CONFLICT: Request with key '${idempotencyKey}' is currently being processed concurrently.`
      );
    }
  }

  // Create or lock the key in PROCESSING state
  await prisma.idempotencyKey.upsert({
    where: { id: idempotencyKey },
    update: { status: 'PROCESSING', lockedAt: new Date() },
    create: {
      id: idempotencyKey,
      organizationId,
      action,
      status: 'PROCESSING',
    },
  });

  try {
    const result = await handler();

    // Mark as COMPLETED and cache response payload
    await prisma.idempotencyKey.update({
      where: { id: idempotencyKey },
      data: {
        status: 'COMPLETED',
        responsePayload: JSON.stringify(result),
      },
    });

    return {
      isDuplicate: false,
      data: result,
    };
  } catch (error) {
    // Mark as FAILED so gateway can retry cleanly
    await prisma.idempotencyKey.update({
      where: { id: idempotencyKey },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}
