import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

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

    if (format === 'csv') {
      const csv = generateCSV(orders || []);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
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

function generateCSV(orders: any[]): string {
  const headers = [
    'Order Number',
    'Customer Name',
    'Email',
    'Phone',
    'Box Size',
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
      order.box_size,
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
