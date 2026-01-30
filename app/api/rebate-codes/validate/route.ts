import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// POST /api/rebate-codes/validate - Validate a rebate code (no auth required)
export async function POST(request: NextRequest) {
  try {
    const { code, boxSize, depositAmount, customerPhone, customerEmail } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    if (!boxSize || !depositAmount) {
      return NextResponse.json({ error: 'Box size and deposit amount required' }, { status: 400 });
    }

    // Call the validation function in the database
    const { data, error } = await supabaseAdmin.rpc('validate_rebate_code', {
      p_code: code.toUpperCase().trim(),
      p_phone: customerPhone || '',
      p_email: customerEmail || '',
      p_box_size: boxSize,
      p_deposit_amount: depositAmount,
    });

    if (error) {
      console.error('Rebate validation error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error validating rebate code:', error);
    return NextResponse.json(
      { error: 'Failed to validate rebate code' },
      { status: 500 }
    );
  }
}
