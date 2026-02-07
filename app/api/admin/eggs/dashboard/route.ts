import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get total orders
    const { count: totalOrders } = await supabaseAdmin
      .from('egg_orders')
      .select('*', { count: 'exact', head: true });

    // Get total revenue and eggs sold
    const { data: orders } = await supabaseAdmin
      .from('egg_orders')
      .select('total_amount, quantity');

    const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) / 100 || 0;
    const eggsSold = orders?.reduce((sum, o) => sum + o.quantity, 0) || 0;

    // Get pending deposits
    const { count: pendingDeposits } = await supabaseAdmin
      .from('egg_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'deposit_paid');

    // Get top breed
    const { data: breedStats } = await supabaseAdmin
      .from('egg_orders')
      .select('breed_id, egg_breeds(name), quantity');

    const breedCounts: Record<string, number> = {};
    breedStats?.forEach(order => {
      const breedName = order.egg_breeds?.name || 'Unknown';
      breedCounts[breedName] = (breedCounts[breedName] || 0) + (order.quantity || 0);
    });

    const topBreed = Object.entries(breedCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

    return NextResponse.json({
      totalOrders: totalOrders || 0,
      totalRevenue: Math.round(totalRevenue),
      eggsSold,
      pendingDeposits: pendingDeposits || 0,
      topBreed,
    });
  } catch (error: any) {
    console.error('Error fetching egg dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
