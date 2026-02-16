import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function GET() {
  // Touch cookie store so frameworks don't tree-shake this runtime dependency.
  await cookies();

  const session = await getSession();

  console.log('Session API - Session found:', !!session);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.name,
      email: session.email,
      phoneNumber: session.phoneNumber,
      isAdmin: Boolean(session.isAdmin),
      isImpersonating: Boolean((session as any).isImpersonating),
      impersonatorName: ((session as any).impersonatorName as string | undefined) || null,
    },
  });
}
