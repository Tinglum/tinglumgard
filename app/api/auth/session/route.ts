import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function GET() {
  // Log all cookies to debug
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log('Session API - All cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })));

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
    },
  });
}
