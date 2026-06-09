import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

/**
 * PATCH /api/admin/orders/[id]/pickup-date
 * Set or update pickup_date and pickup_time on a pig order (admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const pickupDate = typeof body.pickupDate === 'string' ? body.pickupDate.trim() : null;
    const pickupTime = typeof body.pickupTime === 'string' ? body.pickupTime.trim() : null;

    if (!pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (!pickupTime || !/^\d{2}:\d{2}$/.test(pickupTime)) {
      return NextResponse.json({ error: 'Invalid pickup time format. Use HH:MM' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ pickup_date: pickupDate, pickup_time: pickupTime })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true, pickupDate, pickupTime });
  } catch (error) {
    logError('admin-orders-pickup-date', error);
    return NextResponse.json({ error: 'Failed to update pickup date' }, { status: 500 });
  }
}
