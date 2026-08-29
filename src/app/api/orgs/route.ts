import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/security/auth';
import { CreateOrgSchema } from '@/lib/security/validation';
import { logAuditEvent } from '@/lib/security/audit';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }

    const { name, slug } = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Organization slug is already taken. Please choose another.' }, { status: 409 });
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        plan: 'FREE',
        memberships: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    await logAuditEvent({
      organizationId: org.id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'ORG_CREATED',
      resourceType: 'ORGANIZATION',
      resourceId: org.id,
      metadata: { name: org.name, slug: org.slug },
      req,
    });

    return NextResponse.json({ success: true, organization: org });
  } catch (error) {
    console.error('[CREATE_ORG_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
