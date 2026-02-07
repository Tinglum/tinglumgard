import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all egg orders with breed info
    const { data: orders, error } = await supabaseAdmin
      .from('egg_orders')
      .select(`
        *,
        egg_breeds (
          id,
          name
        )
      `);

    if (error) throw error;

    // Calculate breed statistics
    const breedMap: Record<string, any> = {};
    orders?.forEach((order) => {
      const breedName = order.egg_breeds?.name || 'Unknown';
      if (!breedMap[breedName]) {
        breedMap[breedName] = {
          breed_name: breedName,
          total_orders: 0,
          total_eggs: 0,
          total_revenue: 0,
        };
      }
      breedMap[breedName].total_orders += 1;
      breedMap[breedName].total_eggs += order.quantity || 0;
      breedMap[breedName].total_revenue += order.total_amount || 0;
    });

    const breed_stats = Object.values(breedMap).sort(
      (a: any, b: any) => b.total_revenue - a.total_revenue
    );

    // Calculate weekly statistics
    const weekMap: Record<string, any> = {};
    orders?.forEach((order) => {
      const key = `${order.year}-${order.week_number}`;
      if (!weekMap[key]) {
        weekMap[key] = {
          week_number: order.week_number,
          year: order.year,
          orders: 0,
          eggs_sold: 0,
          revenue: 0,
        };
      }
      weekMap[key].orders += 1;
      weekMap[key].eggs_sold += order.quantity || 0;
      weekMap[key].revenue += order.total_amount || 0;
    });

    const week_stats = Object.values(weekMap).sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week_number - a.week_number;
    });

    // Calculate top customers
    const customerMap: Record<string, any> = {};
    orders?.forEach((order) => {
      const email = order.customer_email;
      if (!customerMap[email]) {
        customerMap[email] = {
          customer_email: email,
          customer_name: order.customer_name,
          total_orders: 0,
          total_spent: 0,
        };
      }
      customerMap[email].total_orders += 1;
      customerMap[email].total_spent += order.total_amount || 0;
    });

    const top_customers = Object.values(customerMap)
      .sort((a: any, b: any) => b.total_spent - a.total_spent)
      .slice(0, 10);

    // Calculate summary statistics
    const totalOrders = orders?.length || 0;
    const totalEggs = orders?.reduce((sum, o) => sum + (o.quantity || 0), 0) || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    const summary = {
      avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      avg_eggs_per_order: totalOrders > 0 ? totalEggs / totalOrders : 0,
      total_weeks_with_orders: week_stats.length,
    };

    return NextResponse.json({
      breed_stats,
      week_stats,
      top_customers,
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching egg analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
