import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifySession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  const backupToken = request.cookies.get('tinglum_admin_backup')?.value;

  if (!backupToken) {
    if (session?.isAdmin) {
      return NextResponse.json({ success: true, redirectTo: '/admin' });
    }
    return NextResponse.json({ error: 'No admin backup session found' }, { status: 400 });
  }

  const backupSession = await verifySession(backupToken);
  if (!backupSession?.isAdmin) {
    return NextResponse.json({ error: 'Invalid admin backup session' }, { status: 403 });
  }

  const secure = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({ success: true, redirectTo: '/admin' });

  response.cookies.set('tinglum_session', backupToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  response.cookies.delete('tinglum_admin_backup');
  return response;
}
