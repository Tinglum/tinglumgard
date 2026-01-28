import { NextRequest, NextResponse } from 'next/server';
import { vippsClient } from '@/lib/vipps/api-client';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

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
    const cookieStore = cookies();
    cookieStore.set('vipps_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    // Get the Vipps authorization URL with the state
    const authUrl = vippsClient.getAuthorizationUrl(state);

    // Log the redirect URI being used (for debugging)
    console.log('Vipps Login - Redirect URI:', process.env.NEXT_PUBLIC_APP_URL + '/api/auth/vipps/callback');
    console.log('Vipps Login - Auth URL:', authUrl);

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
