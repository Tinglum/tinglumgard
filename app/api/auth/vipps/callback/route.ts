import { NextRequest, NextResponse } from 'next/server';
import { vippsClient } from '@/lib/vipps/api-client';
import { createSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { sanitizeReturnToPath } from '@/lib/email/links';
import { notifyDeferredPayment } from '@/lib/notifications/deferred-payment';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, APP_BASE_URL } from '@/lib/constants/app';
import { logError } from '@/lib/logger';

/** Attach the session cookie to any NextResponse and return it. */
function withSession(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('vipps_state')?.value;

  if (!code) {
    logError('vipps-callback-no-code', new Error('No code received'));
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  if (!state) {
    logError('vipps-callback-no-state', new Error('No state received'));
    return NextResponse.redirect(new URL('/?error=no_state', request.url));
  }

  if (state !== savedState) {
    logError('vipps-callback-state-mismatch', new Error('State mismatch'));
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

    let stateData: Record<string, unknown>;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
    }

    // Delete the CSRF state cookie
    const cookieStoreForDelete = await cookies();
    cookieStoreForDelete.delete('vipps_state');

    // If there's a pending order, create it with customer details and redirect to payment
    if (stateData.pendingOrder) {
      const orderData = stateData.pendingOrder as Record<string, unknown>;
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
      const appUrl = APP_BASE_URL;
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
        logError('vipps-callback-create-order', new Error(`Failed to create order: ${createOrderResponse.status}`));
        return withSession(
          NextResponse.redirect(new URL(`${orderPagePath}?error=order_creation_failed`, request.url)),
          sessionToken
        );
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
        logError('vipps-callback-deposit-payment', new Error(`Failed to create deposit payment: ${depositResponse.status}`));

        // Notify admin about deferred payment (fire-and-forget)
        notifyDeferredPayment({
          orderId: orderResult.orderId,
          orderNumber: orderResult.orderNumber || '',
          productType: isEggOrder ? 'eggs' : isChickenOrder ? 'chickens' : 'pork',
          customerName: userInfo.name || '',
          customerEmail: userInfo.email || '',
          depositStatus: depositResponse.status,
        }).catch((err) => logError('vipps-callback-deferred-payment-notify', err));

        // Vipps payment unavailable — accept order without deposit and redirect to confirmation
        const confirmationPath = isEggOrder
          ? `/rugeegg/bestill/bekreftelse?orderId=${orderResult.orderId}&payment_deferred=true`
          : isChickenOrder
            ? `/kyllinger/bekreftelse?orderId=${orderResult.orderId}&payment_deferred=true`
            : `/bestill/bekreftelse?orderId=${orderResult.orderId}&payment_deferred=true`;
        return withSession(
          NextResponse.redirect(new URL(confirmationPath, request.url)),
          sessionToken
        );
      }

      const depositResult = await depositResponse.json();

      // Redirect user to Vipps payment - also set session cookie
      return withSession(NextResponse.redirect(depositResult.redirectUrl), sessionToken);
    }

    const returnTo = sanitizeReturnToPath(String(stateData.returnTo || '/bestill'));

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

    return withSession(response, sessionToken);
  } catch (error) {
    logError('vipps-callback', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
