import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  clearSessionCookie();

  const { returnTo } = await request.json().catch(() => ({ returnTo: '/' }));

  return NextResponse.json({ success: true, returnTo });
}
