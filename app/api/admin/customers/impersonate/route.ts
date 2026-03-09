import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || '').trim();
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const customerEmail = normalizeEmail(body?.customerEmail);
    const customerPhone = normalizePhone(body?.customerPhone);
    const returnTo = typeof body?.returnTo === 'string' && body.returnTo ? body.returnTo : '/min-side';

    if (!customerEmail && !customerPhone) {
      return NextResponse.json({ error: 'Customer email or phone is required' }, { status: 400 });
    }

    const userLookup = customerEmail
      ? await supabaseAdmin
      .from('vipps_users')
      .select('id, vipps_sub, phone_number, email, name')
      .eq('email', customerEmail)
      .maybeSingle()
      : { data: null as any, error: null as any };

    if (userLookup.error) {
      return NextResponse.json({ error: 'Failed to look up customer' }, { status: 500 });
    }

    let sessionPayload = userLookup.data
      ? {
          userId: userLookup.data.id,
          vippsSub: userLookup.data.vipps_sub,
          phoneNumber: userLookup.data.phone_number,
          email: userLookup.data.email,
          name: userLookup.data.name,
        }
      : null;

    if (!sessionPayload) {
      const lookups = await Promise.all([
        customerEmail
          ? supabaseAdmin
              .from('orders')
              .select('customer_name, customer_email, customer_phone, created_at')
              .eq('customer_email', customerEmail)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null as any, error: null as any }),
        customerEmail
          ? supabaseAdmin
              .from('egg_orders')
              .select('customer_name, customer_email, customer_phone, created_at')
              .eq('customer_email', customerEmail)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null as any, error: null as any }),
        customerEmail
          ? supabaseAdmin
              .from('chicken_orders')
              .select('customer_name, customer_email, customer_phone, created_at')
              .eq('customer_email', customerEmail)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null as any, error: null as any }),
        customerPhone
          ? supabaseAdmin
              .from('orders')
              .select('customer_name, customer_email, customer_phone, created_at')
              .eq('customer_phone', customerPhone)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null as any, error: null as any }),
        customerPhone
          ? supabaseAdmin
              .from('egg_orders')
              .select('customer_name, customer_email, customer_phone, created_at')
              .eq('customer_phone', customerPhone)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null as any, error: null as any }),
        customerPhone
          ? supabaseAdmin
              .from('chicken_orders')
              .select('customer_name, customer_email, customer_phone, created_at')
              .eq('customer_phone', customerPhone)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null as any, error: null as any }),
      ]);

      for (const lookup of lookups) {
        if (lookup.error) {
          return NextResponse.json({ error: 'Failed to look up customer orders' }, { status: 500 });
        }
      }

      const candidates = lookups
        .map((lookup) => lookup.data)
        .filter(Boolean)
        .sort((a, b) => {
          const aTs = new Date(a.created_at || 0).getTime();
          const bTs = new Date(b.created_at || 0).getTime();
          return bTs - aTs;
        });

      const newest = candidates[0];
      if (!newest) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const resolvedEmail = normalizeEmail(newest.customer_email || customerEmail || '');
      const resolvedPhone = normalizePhone(newest.customer_phone || customerPhone || '');
      const fallbackIdentity = resolvedEmail || resolvedPhone;

      if (!fallbackIdentity) {
        return NextResponse.json({ error: 'Customer identity is incomplete' }, { status: 400 });
      }

      sessionPayload = {
        userId: `impersonated:${fallbackIdentity}`,
        vippsSub: `impersonated:${fallbackIdentity}`,
        phoneNumber: resolvedPhone || undefined,
        email: resolvedEmail || undefined,
        name: newest.customer_name || 'Kunde',
      };
    }

    const impersonatedToken = await createSession({
      userId: sessionPayload.userId,
      vippsSub: sessionPayload.vippsSub,
      phoneNumber: sessionPayload.phoneNumber,
      email: sessionPayload.email,
      name: sessionPayload.name,
      isAdmin: false,
      isImpersonating: true,
      impersonatorId: session.userId,
      impersonatorEmail: session.email,
      impersonatorName: session.name,
    });

    const currentToken = request.cookies.get('tinglum_session')?.value;
    const response = NextResponse.json({ success: true, redirectTo: returnTo });

    const secure = process.env.NODE_ENV === 'production';

    response.cookies.set('tinglum_session', impersonatedToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    if (currentToken) {
      response.cookies.set('tinglum_admin_backup', currentToken, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: 60 * 60 * 6,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Failed to impersonate customer:', error);
    return NextResponse.json({ error: 'Failed to impersonate customer' }, { status: 500 });
  }
}
