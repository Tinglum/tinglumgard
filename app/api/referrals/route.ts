import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

function buildReferralCodeBase(name?: string | null, phone?: string | null) {
  const cleanedName = (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();

  const namePart = cleanedName.slice(0, 4) || 'TG';
  const phoneDigits = (phone || '').replace(/\D/g, '');
  const phonePart = (phoneDigits.slice(-4) || '0000').padStart(4, '0');
  return `${namePart}${phonePart}`;
}

async function createAutoCode(params: {
  ownerPhone: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  orderId?: string | null;
}) {
  const base = buildReferralCodeBase(params.ownerName, params.ownerPhone);

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomLen = attempt === 0 ? 0 : Math.min(4, attempt + 1);
    const randomPart = randomLen
      ? randomBytes(4).toString('hex').toUpperCase().slice(0, randomLen)
      : '';
    const candidate = `${base}${randomPart}`.slice(0, 20);

    const { data, error } = await supabaseAdmin
      .from('referral_codes')
      .insert({
        code: candidate,
        owner_phone: params.ownerPhone,
        owner_name: params.ownerName || null,
        owner_email: params.ownerEmail || null,
        order_id: params.orderId || null,
        max_uses: 5,
        is_active: true,
      })
      .select('code')
      .single();

    if (!error) return data?.code || null;
    if ((error as any)?.code !== '23505') throw error;
  }

  return null;
}

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

    // ACTION: Ensure user has an auto-generated referral code
    if (action === 'ensure_auto') {
      const ownerPhone = (session.phoneNumber || '').trim();
      if (!ownerPhone) {
        return NextResponse.json({ error: 'Phone number missing' }, { status: 400 });
      }

      const { data: existingCode, error: existingCodeError } = await supabaseAdmin
        .from('referral_codes')
        .select('code')
        .eq('owner_phone', ownerPhone)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingCodeError) throw existingCodeError;
      if (existingCode?.code) {
        return NextResponse.json({ success: true, code: existingCode.code, created: false });
      }

      let resolvedOrderId: string | null = null;
      if (typeof orderId === 'string' && orderId.trim()) {
        const { data: orderMatch } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .eq('customer_phone', ownerPhone)
          .maybeSingle();
        resolvedOrderId = orderMatch?.id || null;
      }

      if (!resolvedOrderId) {
        const { data: firstOrder } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('customer_phone', ownerPhone)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        resolvedOrderId = firstOrder?.id || null;
      }

      const autoCode = await createAutoCode({
        ownerPhone,
        ownerName: session.name as string | null | undefined,
        ownerEmail: session.email as string | null | undefined,
        orderId: resolvedOrderId,
      });

      if (!autoCode) {
        return NextResponse.json({ error: 'Could not create code' }, { status: 500 });
      }

      return NextResponse.json({ success: true, code: autoCode, created: true });
    }

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

