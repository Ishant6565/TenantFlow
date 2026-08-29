import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, signSessionToken, COOKIE_NAME } from '@/lib/security/auth';
import { LoginSchema } from '@/lib/security/validation';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check (Prompt 5: Abuse & Brute-force Protection)
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`auth:login:${ip}`, { maxRequests: 5, windowMs: 60000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateLimit.resetInSeconds}s.` },
        { status: 429 }
      );
    }

    // 2. Strict Input Validation (Prompt 4: Input Validation)
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // 3. User Lookup
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: {
              select: { id: true, slug: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 4. Secure Password Verification
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 5. Sign Session JWT
    const token = signSessionToken({ userId: user.id, email: user.email, name: user.name });
    const defaultOrg = user.memberships[0]?.organization?.slug || null;

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      defaultOrgSlug: defaultOrg,
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
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
