import { NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/auth/session';
import { ADMIN_SESSION_MAX_AGE_SECONDS, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/constants/app';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const token = await createSession(
    {
      userId: session.userId,
      vippsSub: session.vippsSub,
      phoneNumber: session.phoneNumber,
      email: session.email,
      name: session.name,
      isAdmin: session.isAdmin,
      role: session.role,
      bnimspAdmin: session.bnimspAdmin,
      isImpersonating: session.isImpersonating,
      impersonatorId: session.impersonatorId,
      impersonatorEmail: session.impersonatorEmail,
      impersonatorName: session.impersonatorName,
    },
    { expiresIn: `${ADMIN_SESSION_MAX_AGE_SECONDS}s` }
  );
  const response = NextResponse.json({ authenticated: true, refreshed: true });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
