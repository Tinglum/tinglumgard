import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Check admin password
    if (password !== 'Pnei2792') {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create admin session
    const sessionData = {
      userId: 'admin',
      vippsSub: 'admin',
      isAdmin: true,
      name: 'Administrator',
    };

    const token = await createSession(sessionData);

    // Set cookie
    const cookieStore = cookies();
    cookieStore.set('tinglum_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('admin-login', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
