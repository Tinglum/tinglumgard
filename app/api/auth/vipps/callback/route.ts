import { NextRequest, NextResponse } from 'next/server';
import { vippsClient } from '@/lib/vipps/client';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = cookies();
  const savedState = cookieStore.get('vipps_state')?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  try {
    const tokens = await vippsClient.exchangeCodeForToken(code);
    const userInfo = await vippsClient.getUserInfo(tokens.access_token);

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

    setSessionCookie(sessionToken);

    cookieStore.delete('vipps_state');

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const returnTo = stateData.returnTo || '/bestill';

    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (error) {
    console.error('Vipps callback error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
