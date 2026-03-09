import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || '').trim();
}

function phoneDigits(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function parseCustomerId(customerId?: string | null): {
  userId: string;
  email: string;
  phoneDigits: string;
  orderSource: 'pig' | 'egg' | 'chicken' | '';
  orderId: string;
} {
  const raw = String(customerId || '').trim();
  if (!raw) {
    return { userId: '', email: '', phoneDigits: '', orderSource: '', orderId: '' };
  }

  if (raw.startsWith('user:')) {
    return { userId: raw.slice(5), email: '', phoneDigits: '', orderSource: '', orderId: '' };
  }

  if (raw.startsWith('email:')) {
    return { userId: '', email: normalizeEmail(raw.slice(6)), phoneDigits: '', orderSource: '', orderId: '' };
  }

  if (raw.startsWith('phone:')) {
    return { userId: '', email: '', phoneDigits: phoneDigits(raw.slice(6)), orderSource: '', orderId: '' };
  }

  if (raw.startsWith('order:')) {
    const rest = raw.slice(6);
    const [source, id] = rest.split(':');
    if (source === 'pig' || source === 'egg' || source === 'chicken') {
      return { userId: '', email: '', phoneDigits: '', orderSource: source, orderId: id || '' };
    }
  }

  const asEmail = normalizeEmail(raw);
  if (asEmail.includes('@')) {
    return { userId: '', email: asEmail, phoneDigits: '', orderSource: '', orderId: '' };
  }

  return { userId: '', email: '', phoneDigits: phoneDigits(raw), orderSource: '', orderId: '' };
}

async function findVippsUserByOrder(orderSource: 'pig' | 'egg' | 'chicken', orderId: string) {
  if (!orderId) return null;

  const table = orderSource === 'pig' ? 'orders' : orderSource === 'egg' ? 'egg_orders' : 'chicken_orders';
  const { data: order, error: orderError } = await supabaseAdmin
    .from(table)
    .select('user_id, customer_email, customer_phone, customer_name')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) return null;

  if (order.user_id) {
    const byId = await supabaseAdmin
      .from('vipps_users')
      .select('id, vipps_sub, phone_number, email, name')
      .eq('id', order.user_id)
      .maybeSingle();
    if (byId.data) return byId.data;
  }

  const email = normalizeEmail(order.customer_email);
  if (email) {
    const byEmail = await supabaseAdmin
      .from('vipps_users')
      .select('id, vipps_sub, phone_number, email, name')
      .eq('email', email)
      .maybeSingle();
    if (byEmail.data) return byEmail.data;
  }

  return null;
}

async function findLatestOrderIdentityByPhoneDigits(targetDigits: string) {
  if (!targetDigits) return null;

  const [pig, egg, chicken] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('user_id, customer_name, customer_email, customer_phone, created_at')
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500),
    supabaseAdmin
      .from('egg_orders')
      .select('user_id, customer_name, customer_email, customer_phone, created_at')
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500),
    supabaseAdmin
      .from('chicken_orders')
      .select('user_id, customer_name, customer_email, customer_phone, created_at')
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (pig.error || egg.error || chicken.error) return null;

  const candidates = [...(pig.data || []), ...(egg.data || []), ...(chicken.data || [])]
    .filter((row) => phoneDigits(row.customer_phone) === targetDigits)
    .sort((a, b) => {
      const aTs = new Date(a.created_at || 0).getTime();
      const bTs = new Date(b.created_at || 0).getTime();
      return bTs - aTs;
    });

  return candidates[0] || null;
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = parseCustomerId(body?.customerId);
    const customerEmail = normalizeEmail(body?.customerEmail || parsed.email);
    const customerPhone = normalizePhone(body?.customerPhone);
    const returnTo = typeof body?.returnTo === 'string' && body.returnTo ? body.returnTo : '/min-side';

    let sessionPayload: {
      userId: string;
      vippsSub: string;
      phoneNumber?: string;
      email?: string;
      name?: string;
    } | null = null;

    if (parsed.userId) {
      const byUserId = await supabaseAdmin
        .from('vipps_users')
        .select('id, vipps_sub, phone_number, email, name')
        .eq('id', parsed.userId)
        .maybeSingle();
      if (byUserId.error) {
        return NextResponse.json({ error: 'Failed to look up customer' }, { status: 500 });
      }
      if (byUserId.data) {
        sessionPayload = {
          userId: byUserId.data.id,
          vippsSub: byUserId.data.vipps_sub,
          phoneNumber: byUserId.data.phone_number || undefined,
          email: byUserId.data.email || undefined,
          name: byUserId.data.name || 'Kunde',
        };
      }
    }

    if (!sessionPayload && parsed.orderSource && parsed.orderId) {
      const byOrder = await findVippsUserByOrder(parsed.orderSource, parsed.orderId);
      if (byOrder) {
        sessionPayload = {
          userId: byOrder.id,
          vippsSub: byOrder.vipps_sub,
          phoneNumber: byOrder.phone_number || undefined,
          email: byOrder.email || undefined,
          name: byOrder.name || 'Kunde',
        };
      }
    }

    if (!sessionPayload && customerEmail) {
      const byEmail = await supabaseAdmin
        .from('vipps_users')
        .select('id, vipps_sub, phone_number, email, name')
        .eq('email', customerEmail)
        .maybeSingle();
      if (byEmail.error) {
        return NextResponse.json({ error: 'Failed to look up customer' }, { status: 500 });
      }
      if (byEmail.data) {
        sessionPayload = {
          userId: byEmail.data.id,
          vippsSub: byEmail.data.vipps_sub,
          phoneNumber: byEmail.data.phone_number || undefined,
          email: byEmail.data.email || undefined,
          name: byEmail.data.name || 'Kunde',
        };
      }
    }

    if (!sessionPayload) {
      const digits = parsed.phoneDigits || phoneDigits(customerPhone);
      const latestByPhone = await findLatestOrderIdentityByPhoneDigits(digits);
      if (latestByPhone?.user_id) {
        const byUserId = await supabaseAdmin
          .from('vipps_users')
          .select('id, vipps_sub, phone_number, email, name')
          .eq('id', latestByPhone.user_id)
          .maybeSingle();
        if (byUserId.data) {
          sessionPayload = {
            userId: byUserId.data.id,
            vippsSub: byUserId.data.vipps_sub,
            phoneNumber: byUserId.data.phone_number || undefined,
            email: byUserId.data.email || undefined,
            name: byUserId.data.name || latestByPhone.customer_name || 'Kunde',
          };
        }
      }

      if (!sessionPayload && latestByPhone) {
        const resolvedEmail = normalizeEmail(latestByPhone.customer_email || customerEmail || '');
        const resolvedPhone = normalizePhone(latestByPhone.customer_phone || customerPhone || '');
        const fallbackIdentity = resolvedEmail || resolvedPhone || digits;

        if (fallbackIdentity) {
          sessionPayload = {
            userId: `impersonated:${fallbackIdentity}`,
            vippsSub: `impersonated:${fallbackIdentity}`,
            phoneNumber: resolvedPhone || undefined,
            email: resolvedEmail || undefined,
            name: latestByPhone.customer_name || 'Kunde',
          };
        }
      }
    }

    if (!sessionPayload) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
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
