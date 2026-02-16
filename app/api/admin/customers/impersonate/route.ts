import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const customerEmail = normalizeEmail(body?.customerEmail);
    const returnTo = typeof body?.returnTo === 'string' && body.returnTo ? body.returnTo : '/min-side';

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('vipps_users')
      .select('id, vipps_sub, phone_number, email, name')
      .eq('email', customerEmail)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found in Vipps users' }, { status: 404 });
    }

    const impersonatedToken = await createSession({
      userId: customer.id,
      vippsSub: customer.vipps_sub,
      phoneNumber: customer.phone_number,
      email: customer.email,
      name: customer.name,
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
