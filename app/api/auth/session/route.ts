import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  console.log('Session data:', session);

  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.name,
      email: session.email,
      phoneNumber: session.phoneNumber,
    },
  });
}
