import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Fetch orders that belong to the user by user_id
    const { data: userOrders, error: userOrdersError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        payments (*)
      `)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (userOrdersError) throw userOrdersError;

    // Also fetch anonymous orders that match the user's phone number or email
    // This allows us to link orders made before they logged in
    const { data: anonymousOrders, error: anonymousError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        payments (*)
      `)
      .is('user_id', null)
      .or(`customer_phone.eq.${session.phoneNumber},customer_email.eq.${session.email}`)
      .order('created_at', { ascending: false });

    if (anonymousError) throw anonymousError;

    // Link matching anonymous orders to the current user
    if (anonymousOrders && anonymousOrders.length > 0) {
      console.log(`Linking ${anonymousOrders.length} anonymous orders to user ${session.userId} by phone/email match`);

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ user_id: session.userId })
        .in('id', anonymousOrders.map(o => o.id));

      if (updateError) {
        // If foreign key constraint fails, the user doesn't exist in auth.users yet
        // This can happen with Vipps login where the session exists but user record doesn't
        // Just log and continue - orders will still be shown via phone/email match
        console.warn('Could not link anonymous orders (user may not exist in auth.users yet):', updateError.message);
      } else {
        // Update the orders in memory to reflect the change
        anonymousOrders.forEach(order => {
          order.user_id = session.userId;
        });
      }
    }

    // Combine both sets of orders
    const allOrders = [...(userOrders || []), ...(anonymousOrders || [])];

    // Sort by created_at descending
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ orders: allOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
