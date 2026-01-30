import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET /api/referrals - Get user's referral code and stats
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get user's referral code
    const { data: referralCode, error: codeError } = await supabaseAdmin
      .from('referral_codes')
      .select('*')
      .eq('owner_phone', session.phoneNumber)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) throw codeError;

    // If no code exists, return null
    if (!referralCode) {
      return NextResponse.json({
        hasCode: false,
        code: null,
        stats: null,
        referrals: [],
      });
    }

    // Get referral history
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_phone', session.phoneNumber)
      .order('created_at', { ascending: false });

    if (referralsError) throw referralsError;

    // Calculate if user has unused bonus potential
    const unusedBonusCount = Math.max(0, referrals.length - referralCode.max_uses);

    return NextResponse.json({
      hasCode: true,
      code: referralCode.code,
      stats: {
        totalReferrals: referrals.length,
        creditsEarned: referralCode.total_credits_earned,
        creditsAvailable: referralCode.credits_available,
        creditsUsed: referralCode.credits_used,
        maxUses: referralCode.max_uses,
        currentUses: referralCode.current_uses,
        unusedBonusCount,
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        name: r.referee_name,
        date: r.created_at,
        orderNumber: r.order_number,
        discountAmount: r.discount_amount_nok,
        creditAmount: r.credit_amount_nok,
        creditApplied: r.credit_applied,
      })),
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 });
  }
}

// POST /api/referrals - Create or claim referral code
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { action, code, orderId } = await request.json();

    // ACTION: Create a new referral code
    if (action === 'create') {
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'Code is required' }, { status: 400 });
      }

      // Validate code format (uppercase alphanumeric, 4-20 chars)
      const codeUpper = code.toUpperCase().trim();
      if (!/^[A-Z0-9]{4,20}$/.test(codeUpper)) {
        return NextResponse.json(
          { error: 'Koden må være 4-20 tegn (kun bokstaver og tall)' },
          { status: 400 }
        );
      }

      // Check if user already has a code
      const { data: existing } = await supabaseAdmin
        .from('referral_codes')
        .select('id')
        .eq('owner_phone', session.phoneNumber)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Du har allerede en kode' }, { status: 400 });
      }

      // Get user's first order (to link code to)
      const { data: userOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('customer_phone', session.phoneNumber)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Create the referral code
      const { data: newCode, error: createError } = await supabaseAdmin
        .from('referral_codes')
        .insert({
          code: codeUpper,
          owner_phone: session.phoneNumber,
          owner_name: session.name,
          owner_email: session.email,
          order_id: userOrder?.id || null,
          max_uses: 5,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          // Unique constraint violation
          return NextResponse.json({ error: 'Denne koden er allerede i bruk' }, { status: 400 });
        }
        throw createError;
      }

      return NextResponse.json({
        success: true,
        code: newCode.code,
      });
    }

    // ACTION: Increase max uses for existing code
    if (action === 'increase_limit') {
      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      // Verify order belongs to user
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .eq('customer_phone', session.phoneNumber)
        .maybeSingle();

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Get current referral code
      const { data: currentCode } = await supabaseAdmin
        .from('referral_codes')
        .select('max_uses')
        .eq('owner_phone', session.phoneNumber)
        .single();

      if (currentCode) {
        // Update referral code max uses
        const { error: updateError } = await supabaseAdmin
          .from('referral_codes')
          .update({
            max_uses: currentCode.max_uses + 5,
          })
          .eq('owner_phone', session.phoneNumber);

        if (updateError) throw updateError;
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing referral code:', error);
    return NextResponse.json({ error: 'Failed to manage referral code' }, { status: 500 });
  }
}
