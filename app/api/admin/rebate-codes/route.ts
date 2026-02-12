import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// GET /api/admin/rebate-codes - Get all rebate codes
export async function GET() {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: codes, error } = await supabaseAdmin
      .from('rebate_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ codes });
  } catch (error) {
    logError('admin-rebate-codes-get', error);
    return NextResponse.json({ error: 'Failed to fetch rebate codes' }, { status: 500 });
  }
}

// POST /api/admin/rebate-codes - Create new rebate code
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      maxUsesPerCustomer,
      validFrom,
      validUntil,
      minOrderAmount,
      applicableTo,
      description,
    } = await request.json();

    // Validation
    if (!code || !discountType || !discountValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const codeUpper = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{4,20}$/.test(codeUpper)) {
      return NextResponse.json(
        { error: 'Koden må være 4-20 tegn (kun bokstaver og tall)' },
        { status: 400 }
      );
    }

    if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Prosent må være mellom 0 og 100' },
        { status: 400 }
      );
    }

    const { data: newCode, error: createError } = await supabaseAdmin
      .from('rebate_codes')
      .insert({
        code: codeUpper,
        discount_type: discountType,
        discount_value: discountValue,
        max_uses: maxUses || null,
        max_uses_per_customer: maxUsesPerCustomer || 1,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        min_order_amount: minOrderAmount || null,
        applicable_to: applicableTo || ['8kg', '9kg', '10kg', '12kg'],
        description: description || '',
        created_by: session.name || session.email,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'Denne koden finnes allerede' }, { status: 400 });
      }
      throw createError;
    }

    return NextResponse.json({ code: newCode });
  } catch (error) {
    console.error('Error creating rebate code:', error);
    return NextResponse.json({ error: 'Failed to create rebate code' }, { status: 500 });
  }
}

// DELETE /api/admin/rebate-codes - Delete rebate code
export async function DELETE(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Code ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('rebate_codes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rebate code:', error);
    return NextResponse.json({ error: 'Failed to delete rebate code' }, { status: 500 });
  }
}

// PATCH /api/admin/rebate-codes - Update rebate code
export async function PATCH(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Code ID required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('rebate_codes')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ code: data });
  } catch (error) {
    console.error('Error updating rebate code:', error);
    return NextResponse.json({ error: 'Failed to update rebate code' }, { status: 500 });
  }
}
