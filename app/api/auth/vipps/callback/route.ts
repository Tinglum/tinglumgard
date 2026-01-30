import { NextRequest, NextResponse } from 'next/server';
import { vippsClient } from '@/lib/vipps/api-client';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('Vipps Callback - Received params:', { code: code?.substring(0, 10) + '...', state: state?.substring(0, 20) + '...' });

  const cookieStore = await cookies();
  const savedState = cookieStore.get('vipps_state')?.value;

  console.log('Vipps Callback - Saved state:', savedState?.substring(0, 20) + '...');
  console.log('Vipps Callback - All cookies:', cookieStore.getAll().map(c => c.name));

  if (!code) {
    console.error('Vipps Callback - No code received');
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  if (!state) {
    console.error('Vipps Callback - No state received');
    return NextResponse.redirect(new URL('/?error=no_state', request.url));
  }

  if (state !== savedState) {
    console.error('Vipps Callback - State mismatch', { received: state?.substring(0, 20), saved: savedState?.substring(0, 20) });
    return NextResponse.redirect(new URL('/?error=state_mismatch', request.url));
  }

  try {
    console.log('Vipps Callback - Exchanging code for token');
    const tokens = await vippsClient.exchangeCodeForToken(code);
    console.log('Vipps Callback - Got tokens, fetching user info');
    const userInfo = await vippsClient.getUserInfo(tokens.access_token);
    console.log('Vipps Callback - Got user info:', { sub: userInfo.sub, email: userInfo.email });

    let user = await supabaseAdmin
      .from('vipps_users')
      .select('*')
      .eq('vipps_sub', userInfo.sub)
      .maybeSingle();

    if (!user.data) {
      const { data: newUser, error } = await supabaseAdmin
        .from('vipps_users')
        .insert({
          vipps_sub: userInfo.sub,
          phone_number: userInfo.phone_number,
          email: userInfo.email,
          name: userInfo.name,
        })
        .select()
        .single();

      if (error) throw error;
      user.data = newUser;
    } else {
      await supabaseAdmin
        .from('vipps_users')
        .update({
          phone_number: userInfo.phone_number,
          email: userInfo.email,
          name: userInfo.name,
          updated_at: new Date().toISOString(),
        })
        .eq('vipps_sub', userInfo.sub);
    }

    const sessionToken = await createSession({
      userId: user.data.id,
      vippsSub: userInfo.sub,
      phoneNumber: userInfo.phone_number,
      email: userInfo.email,
      name: userInfo.name,
      isAdmin: user.data.is_admin || false,
    });

    console.log('Vipps Callback - Setting session cookie');
    await setSessionCookie(sessionToken);
    console.log('Vipps Callback - Session cookie set successfully');

    const cookieStoreForDelete = await cookies();
    cookieStoreForDelete.delete('vipps_state');

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());

    // If there's a pending order, create it with customer details and redirect to payment
    if (stateData.pendingOrder) {
      const orderData = stateData.pendingOrder;

      // Create the order with customer details from Vipps
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const createOrderResponse = await fetch(`${appUrl}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...orderData,
          customerName: userInfo.name,
          customerEmail: userInfo.email,
          customerPhone: userInfo.phone_number,
        }),
      });

      if (!createOrderResponse.ok) {
        console.error('Failed to create order:', await createOrderResponse.text());
        return NextResponse.redirect(new URL('/bestill?error=order_creation_failed', request.url));
      }

      const orderResult = await createOrderResponse.json();

      // Immediately redirect to deposit payment
      const depositResponse = await fetch(`${appUrl}/api/orders/${orderResult.orderId}/deposit`, {
        method: 'POST',
      });

      if (!depositResponse.ok) {
        console.error('Failed to create deposit payment:', await depositResponse.text());
        return NextResponse.redirect(new URL(`/bestill?error=payment_failed&orderId=${orderResult.orderId}`, request.url));
      }

      const depositResult = await depositResponse.json();

      // Redirect user to Vipps payment
      return NextResponse.redirect(depositResult.redirectUrl);
    }

    const returnTo = stateData.returnTo || '/bestill';
    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (error) {
    console.error('Vipps callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Vipps callback error details:', errorMessage);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
