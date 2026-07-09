import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// POST /api/rebate-codes/validate - Validate a rebate code (no auth required)
export async function POST(request: NextRequest) {
  try {
    const { code, boxSize, presetSlug, depositAmount, customerPhone, customerEmail } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    if (!boxSize || !depositAmount) {
      return NextResponse.json({ error: 'Box size and deposit amount required' }, { status: 400 });
    }

    // Call the validation function in the database. `presetSlug` (e.g.
    // 'premium-cuts') is the preferred match since it unambiguously
    // identifies a Mangalitsa box preset; `boxSize` alone is ambiguous
    // because multiple presets can share the same target weight.
    const legacyArgs = {
      p_code: code.toUpperCase().trim(),
      p_phone: customerPhone || '',
      p_email: customerEmail || '',
      p_box_size: boxSize,
      p_deposit_amount: depositAmount,
    };

    let { data, error } = await supabaseAdmin.rpc('validate_rebate_code', {
      ...legacyArgs,
      p_preset_slug: presetSlug || null,
    });

    // Until migration 20260707000000 is applied, the DB function lacks
    // p_preset_slug (PGRST202: no matching function signature). Fall back
    // to the legacy signature so validation keeps working either way.
    if (error && (error.code === 'PGRST202' || /function/i.test(error.message || ''))) {
      ({ data, error } = await supabaseAdmin.rpc('validate_rebate_code', legacyArgs));
    }

    if (error) {
      logError('rebate-codes-validate', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    logError('rebate-codes-validate', error);
    return NextResponse.json(
      { error: 'Failed to validate rebate code' },
      { status: 500 }
    );
  }
}
