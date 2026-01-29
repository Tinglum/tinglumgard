import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Fetch all orders that are ready for pickup or delivery
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .in('status', ['ready_for_pickup', 'completed'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group orders by delivery type and date
    const groups = orders?.reduce((acc, order) => {
      const date = order.marked_delivered_at || new Date().toISOString().split('T')[0];
      const key = `${date}-${order.delivery_type}`;

      if (!acc[key]) {
        acc[key] = {
          date,
          delivery_type: order.delivery_type,
          orders: [],
        };
      }

      acc[key].orders.push({
        order_number: order.order_number,
        customer_name: order.customer_name,
        box_size: order.box_size,
        fresh_delivery: order.fresh_delivery,
        marked_collected: !!order.marked_delivered_at,
      });

      return acc;
    }, {} as Record<string, any>) || {};

    const groupsArray = Object.values(groups);

    return NextResponse.json({ groups: groupsArray });
  } catch (error) {
    console.error('Delivery calendar error:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery calendar' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, order_number } = body;

    if (action === 'mark_collected') {
      const { error } = await supabaseAdmin
        .from('orders')
        .update({
          marked_delivered_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('order_number', order_number);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Delivery calendar POST error:', error);
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 });
  }
}
