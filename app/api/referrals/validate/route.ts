import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

// POST /api/referrals/validate - Validate a referral code
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Call the validation function in the database
    const { data, error } = await supabaseAdmin.rpc('validate_referral_code', {
      p_code: code.toUpperCase().trim(),
      p_user_id: session.userId,
      p_phone: session.phoneNumber || '',
      p_email: session.email || '',
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      { error: 'Failed to validate referral code' },
      { status: 500 }
    );
  }
}
