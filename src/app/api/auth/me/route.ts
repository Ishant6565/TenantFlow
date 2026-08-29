import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/security/auth';
import { getUserOrganizations } from '@/lib/security/tenant';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null, organizations: [] }, { status: 401 });
  }

  const organizations = await getUserOrganizations(user.id);

  return NextResponse.json({
    authenticated: true,
    user,
    organizations,
  });
}
