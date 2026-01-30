import { NextRequest, NextResponse } from 'next/server';
import { vippsClient } from '@/lib/vipps/api-client';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/min-side';

    // Create state data for simple login (no pending order)
    const stateData = {
      nonce: randomBytes(16).toString('hex'),
      returnTo,
    };

    // Encode state as base64
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Store state in a cookie for CSRF protection
    const cookieStore = await cookies();
    cookieStore.set('vipps_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    console.log('Vipps Login (GET) - Set cookie with state:', state.substring(0, 20) + '...');

    // Get the Vipps authorization URL with the state
    const authUrl = vippsClient.getAuthorizationUrl(state);

    // Log the redirect URI being used (for debugging)
    console.log('Vipps Login (GET) - Redirect URI:', process.env.NEXT_PUBLIC_APP_URL + '/api/auth/vipps/callback');
    console.log('Vipps Login (GET) - Auth URL:', authUrl);
    console.log('Vipps Login (GET) - Return to:', returnTo);

    // Redirect to Vipps OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Vipps login error:', error);
    return NextResponse.redirect(new URL('/?error=vipps_login_failed', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the pending order data from the request body
    const body = await request.json();
    const { orderDetails } = body;

    // Create state data that includes the pending order
    const stateData = {
      nonce: randomBytes(16).toString('hex'),
      pendingOrder: orderDetails,
      returnTo: '/bestill',
    };

    // Encode state as base64
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Store state in a cookie for CSRF protection
    const cookieStore = await cookies();
    cookieStore.set('vipps_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    console.log('Vipps Login (POST) - Set cookie with state:', state.substring(0, 20) + '...');

    // Get the Vipps authorization URL with the state
    const authUrl = vippsClient.getAuthorizationUrl(state);

    // Log the redirect URI being used (for debugging)
    console.log('Vipps Login (POST) - Redirect URI:', process.env.NEXT_PUBLIC_APP_URL + '/api/auth/vipps/callback');
    console.log('Vipps Login (POST) - Auth URL:', authUrl);

    // Return the auth URL so the client can redirect
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Vipps login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Vipps login' },
      { status: 500 }
    );
  }
}
