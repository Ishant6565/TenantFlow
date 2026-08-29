import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, signSessionToken, COOKIE_NAME } from '@/lib/security/auth';
import { RegisterSchema } from '@/lib/security/validation';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check (Prompt 5: Abuse & Bot Protection)
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`auth:register:${ip}`, { maxRequests: 5, windowMs: 60000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.resetInSeconds}s.` },
        { status: 429 }
      );
    }

    // 2. Strict Input Validation (Prompt 4: Input Validation)
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    // 3. Prevent duplicate account
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // 4. Secure Password Hashing (Prompt 1: Secure Authentication)
    const passwordHash = await hashPassword(password);

    // 5. Create User & default Personal Organization
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    const orgSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;
    const defaultOrg = await prisma.organization.create({
      data: {
        name: `${name}'s Workspace`,
        slug: orgSlug,
        plan: 'FREE',
        memberships: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        auditLogs: {
          create: {
            actorId: user.id,
            actorEmail: user.email,
            action: 'ORG_CREATED',
            resourceType: 'ORGANIZATION',
            metadata: JSON.stringify({ name: `${name}'s Workspace`, slug: orgSlug }),
            ipAddress: ip,
          },
        },
      },
    });

    // 6. Sign JWT Session Cookie
    const token = signSessionToken({ userId: user.id, email: user.email, name: user.name });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      defaultOrgSlug: defaultOrg.slug,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[REGISTER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
