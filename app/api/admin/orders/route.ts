import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { normalizeOrderForDisplay } from '@/lib/orders/display';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const format = searchParams.get('format');

    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        mangalitsa_preset:mangalitsa_box_presets(id, slug, name_no, name_en, target_weight_kg),
        order_extras (
          *,
          extras_catalog (*)
        ),
        payments (*)
      `);

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const normalizedOrders = (orders || []).map((order) => normalizeOrderForDisplay(order));

    if (format === 'csv') {
      const csv = generateCSV(normalizedOrders);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ orders: normalizedOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

function generateCSV(orders: any[]): string {
  const headers = [
    'Order Number',
    'Customer Name',
    'Email',
    'Phone',
    'Product',
    'Box Size (kg)',
    'Status',
    'Delivery Type',
    'Fresh Delivery',
    'Total Amount',
    'Deposit Paid',
    'Remainder Paid',
    'Created At',
    'Notes',
    'Admin Notes',
  ];

  const rows = orders.map((order) => {
    const depositPayment = order.payments?.find((p: any) => p.payment_type === 'deposit');
    const remainderPayment = order.payments?.find((p: any) => p.payment_type === 'remainder');

    return [
      order.order_number,
      order.customer_name,
      order.customer_email,
      order.customer_phone || '',
      order.display_box_name_no || order.display_box_name_en || 'Mangalitsa',
      order.box_size ?? '',
      order.status,
      order.delivery_type,
      order.fresh_delivery ? 'Yes' : 'No',
      order.total_amount,
      depositPayment?.status === 'completed' ? 'Yes' : 'No',
      remainderPayment?.status === 'completed' ? 'Yes' : 'No',
      new Date(order.created_at).toLocaleDateString('nb-NO'),
      (order.notes || '').replace(/"/g, '""'),
      (order.admin_notes || '').replace(/"/g, '""'),
    ]
      .map((field) => `"${field}"`)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
