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
    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('vipps_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Get the Vipps authorization URL with the state
    const authUrl = vippsClient.getAuthorizationUrl(state);

    // Keep auth logs high-level only (no state/auth URL with encoded payloads).
    console.log('Vipps Login (GET) - Initiating OAuth redirect', { returnTo });

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
    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('vipps_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Get the Vipps authorization URL with the state
    const authUrl = vippsClient.getAuthorizationUrl(state);

    // Keep auth logs high-level only (no state/auth URL with encoded payloads).
    console.log('Vipps Login (POST) - Initiating OAuth redirect', {
      hasPendingOrder: !!orderDetails,
      productType: orderDetails?.productType || null,
    });

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
