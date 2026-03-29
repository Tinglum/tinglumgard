import { NextRequest, NextResponse } from 'next/server';
import { vippsClient } from '@/lib/vipps/api-client';
import { createSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { sanitizeReturnToPath } from '@/lib/email/links';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('vipps_state')?.value;

  if (!code) {
    console.error('Vipps Callback - No code received');
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  if (!state) {
    console.error('Vipps Callback - No state received');
    return NextResponse.redirect(new URL('/?error=no_state', request.url));
  }

  if (state !== savedState) {
    console.error('Vipps Callback - State mismatch');
    return NextResponse.redirect(new URL('/?error=state_mismatch', request.url));
  }

  try {
    console.log('Vipps Callback - Exchanging code for token');
    const tokens = await vippsClient.exchangeCodeForToken(code);
    console.log('Vipps Callback - Got tokens, fetching user info');
    const userInfo = await vippsClient.getUserInfo(tokens.access_token);
    console.log('Vipps Callback - Got user info');

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
      role: user.data.is_admin ? 'admin' : 'customer',
    });

    console.log('Vipps Callback - Creating session token');

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());

    // Delete the CSRF state cookie
    const cookieStoreForDelete = await cookies();
    cookieStoreForDelete.delete('vipps_state');

    // If there's a pending order, create it with customer details and redirect to payment
    if (stateData.pendingOrder) {
      const orderData = stateData.pendingOrder;
      const productType = String(orderData.productType || '').toLowerCase();
      const isEggOrder = productType === 'eggs';
      const isChickenOrder = productType === 'chickens' || productType === 'chicken';
      const orderPagePath = isEggOrder ? '/rugeegg/bestill' : isChickenOrder ? '/kyllinger' : '/bestill';
      const createOrderPath = isEggOrder
        ? '/api/eggs/checkout'
        : isChickenOrder
          ? '/api/chicken-checkout'
          : '/api/checkout';
      const depositOrderPath = isEggOrder
        ? '/api/eggs/orders'
        : isChickenOrder
          ? '/api/chickens/orders'
          : '/api/orders';

      // Create the order with customer details from Vipps
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const createOrderResponse = await fetch(
        `${appUrl}${createOrderPath}`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `tinglum_session=${sessionToken}`,
        },
        body: JSON.stringify({
          ...orderData,
          customerName: userInfo.name,
          customerEmail: userInfo.email,
          customerPhone: userInfo.phone_number,
        }),
      });

      if (!createOrderResponse.ok) {
        console.error('Failed to create order', { status: createOrderResponse.status });
        const errorRedirect = NextResponse.redirect(
          new URL(`${orderPagePath}?error=order_creation_failed`, request.url)
        );
        errorRedirect.cookies.set('tinglum_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        return errorRedirect;
      }

      const orderResult = await createOrderResponse.json();
      const depositHeaders: HeadersInit = {
        Cookie: `tinglum_session=${sessionToken}`,
      };
      if (orderResult.orderAccessToken) {
        depositHeaders['x-order-access-token'] = orderResult.orderAccessToken;
      }

      // Immediately redirect to deposit payment
      const depositResponse = await fetch(
        `${appUrl}${depositOrderPath}/${orderResult.orderId}/deposit`,
        {
        method: 'POST',
        headers: depositHeaders,
      });

      if (!depositResponse.ok) {
        console.error('Failed to create deposit payment', { status: depositResponse.status });
        // Vipps payment unavailable — accept order without deposit and redirect to confirmation
        const confirmationPath = isEggOrder
          ? `/rugeegg/bestill/bekreftelse?orderId=${orderResult.orderId}&payment_deferred=true`
          : isChickenOrder
            ? `/kyllinger/bekreftelse?orderId=${orderResult.orderId}&payment_deferred=true`
            : `/bestill/bekreftelse?orderId=${orderResult.orderId}&payment_deferred=true`;
        const deferredRedirect = NextResponse.redirect(
          new URL(confirmationPath, request.url)
        );
        deferredRedirect.cookies.set('tinglum_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        return deferredRedirect;
      }

      const depositResult = await depositResponse.json();

      // Redirect user to Vipps payment - also set session cookie
      const paymentRedirect = NextResponse.redirect(depositResult.redirectUrl);
      paymentRedirect.cookies.set('tinglum_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return paymentRedirect;
    }

    const returnTo = sanitizeReturnToPath(stateData.returnTo || '/bestill');

    // Create an HTML response that sets the cookie and redirects
    // This is a workaround for Netlify Functions cookie issues
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Logging in...</title>
        </head>
        <body>
          <p>Logging in, please wait...</p>
          <script>
            // Force redirect to ensure cookie is set
            window.location.href = ${JSON.stringify(returnTo)};
          </script>
        </body>
      </html>
    `;

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });

    // Set the session cookie
    response.cookies.set('tinglum_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log('Vipps Callback - Set session cookie in HTML response');

    return response;
  } catch (error) {
    console.error('Vipps callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Vipps callback error details:', errorMessage);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
