import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { sanitizeReturnToPath } from '@/lib/email/links';
import { cookies } from 'next/headers';
import { logError } from '@/lib/logger';
import { ADMIN_SESSION_MAX_AGE_SECONDS, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/constants/app';

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

    const token = await createSession(sessionData, { expiresIn: `${ADMIN_SESSION_MAX_AGE_SECONDS}s` });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ success: true, redirectTo });
  } catch (error) {
    logError('admin-login', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
