import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Fetch orders that either belong to the user OR are anonymous (user_id is null)
    // This allows us to show and link anonymous orders after user logs in
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        payments (*)
      `)
      .or(`user_id.eq.${session.userId},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Link any anonymous orders to the current user
    if (orders && orders.length > 0) {
      const anonymousOrders = orders.filter(o => !o.user_id);

      if (anonymousOrders.length > 0) {
        console.log(`Linking ${anonymousOrders.length} anonymous orders to user ${session.userId}`);

        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ user_id: session.userId })
          .in('id', anonymousOrders.map(o => o.id));

        if (updateError) {
          console.error('Error linking anonymous orders:', updateError);
        } else {
          // Update the orders in memory to reflect the change
          anonymousOrders.forEach(order => {
            order.user_id = session.userId;
          });
        }
      }
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
