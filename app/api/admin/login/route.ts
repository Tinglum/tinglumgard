import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { sanitizeReturnToPath } from '@/lib/email/links';
import { cookies } from 'next/headers';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || '');
    const adminPassword = process.env.ADMIN_PASSWORD;
    const returnToRaw =
      typeof body?.returnTo === 'string' && body.returnTo.trim()
        ? body.returnTo
        : request.nextUrl.searchParams.get('returnTo') || '/admin';
    const redirectTo = sanitizeReturnToPath(returnToRaw);

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
      role: 'admin' as const,
      name: 'Administrator',
    };

    const token = await createSession(sessionData);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('tinglum_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true, redirectTo });
  } catch (error) {
    logError('admin-login', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
