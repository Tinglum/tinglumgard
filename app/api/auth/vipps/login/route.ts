import { NextRequest, NextResponse } from 'next/server';
import { vippsClient } from '@/lib/vipps/api-client';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnTo = searchParams.get('returnTo') || '/bestill';

  const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64');

  const cookieStore = cookies();
  cookieStore.set('vipps_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  const authUrl = vippsClient.getAuthorizationUrl(state);

  return NextResponse.redirect(authUrl);
}
