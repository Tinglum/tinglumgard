import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      logError('admin-login-missing-password', new Error('ADMIN_PASSWORD is not configured'));
      return NextResponse.json({ error: 'Admin login not configured' }, { status: 500 });
    }

    // Check admin password
    if (password !== adminPassword) {
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
