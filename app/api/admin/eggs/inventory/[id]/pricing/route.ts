import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const inventoryId = params.id;
    const body = await request.json();
    const { earlyBirdDiscountPct, earlyBirdCutoffDays } = body;

    const updates: Record<string, number> = {};

    if (earlyBirdDiscountPct !== undefined) {
      const discount = Number(earlyBirdDiscountPct);
      if (!Number.isFinite(discount) || !Number.isInteger(discount) || discount < 0 || discount > 50) {
        return NextResponse.json(
          { error: 'earlyBirdDiscountPct must be an integer between 0 and 50' },
          { status: 400 }
        );
      }
      updates.early_bird_discount_pct = discount;
    }

    if (earlyBirdCutoffDays !== undefined) {
      const cutoff = Number(earlyBirdCutoffDays);
      if (!Number.isFinite(cutoff) || !Number.isInteger(cutoff) || cutoff < 0) {
        return NextResponse.json(
          { error: 'earlyBirdCutoffDays must be a non-negative integer' },
          { status: 400 }
        );
      }
      updates.early_bird_cutoff_days = cutoff;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const { data: inventory, error: updateError } = await supabaseAdmin
      .from('egg_inventory')
      .update(updates)
      .eq('id', inventoryId)
      .select('id, breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status, early_bird_discount_pct, early_bird_cutoff_days')
      .maybeSingle();

    if (updateError) {
      logError('admin-egg-inventory-pricing-update', updateError);
      return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 });
    }

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, inventory });
  } catch (error) {
    logError('admin-egg-inventory-pricing-main', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
