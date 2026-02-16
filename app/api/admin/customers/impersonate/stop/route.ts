import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifySession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isImpersonating) {
    return NextResponse.json({ error: 'No active impersonation' }, { status: 400 });
  }

  const backupToken = request.cookies.get('tinglum_admin_backup')?.value;
  const secure = process.env.NODE_ENV === 'production';

  if (!backupToken) {
    const response = NextResponse.json({ success: true, redirectTo: '/admin' });
    response.cookies.set('tinglum_session', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('tinglum_admin_backup', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  }

  const verifiedBackup = await verifySession(backupToken);
  if (!verifiedBackup?.isAdmin) {
    return NextResponse.json({ error: 'Invalid admin backup session' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, redirectTo: '/admin' });
  response.cookies.set('tinglum_session', backupToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  response.cookies.set('tinglum_admin_backup', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

