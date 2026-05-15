import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError } from '@/lib/logger';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('tinglum_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('admin-logout', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
