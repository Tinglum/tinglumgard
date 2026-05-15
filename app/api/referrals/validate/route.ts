import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

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
      p_phone: session.phoneNumber || '',
      p_email: session.email || '',
    });

    if (error) throw error;

    if (data?.valid && data?.code_id) {
      const { data: referralCode } = await supabaseAdmin
        .from('referral_codes')
        .select('id, owner_phone, order_id')
        .eq('id', data.code_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!referralCode) {
        return NextResponse.json({ valid: false, error: 'Ugyldig kode' });
      }

      let firstOrderId = referralCode.order_id || null;
      if (!firstOrderId) {
        const { data: firstOrder } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('customer_phone', referralCode.owner_phone)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        firstOrderId = firstOrder?.id || null;
      }

      if (!firstOrderId) {
        return NextResponse.json({
          valid: false,
          error: 'Koden blir aktiv etter at eieren har lagt inn sin første bestilling',
        });
      }

      if (!referralCode.order_id) {
        await supabaseAdmin
          .from('referral_codes')
          .update({ order_id: firstOrderId })
          .eq('id', referralCode.id);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    logError('referrals-validate', error);
    return NextResponse.json(
      { error: 'Failed to validate referral code' },
      { status: 500 }
    );
  }
}
