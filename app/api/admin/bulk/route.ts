import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import { getEffectiveBoxSize } from '@/lib/orders/display';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, orderIds, data } = body;

    switch (action) {
      case 'update_status':
        return await bulkUpdateStatus(orderIds, data.status);

      case 'send_email':
        return await bulkSendEmail(orderIds, data.subject, data.message);

      case 'lock_orders':
        return await bulkLockOrders(orderIds);

      case 'export_production':
        return await exportProductionList(orderIds);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: 'Bulk operation failed' },
      { status: 500 }
    );
  }
}

async function bulkUpdateStatus(orderIds: string[], newStatus: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status: newStatus })
    .in('id', orderIds)
    .select();

  if (error) throw error;

  // If marking as ready_for_pickup, send notification emails
  if (newStatus === 'ready_for_pickup') {
    for (const order of data) {
      if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
          await sendEmail({
            to: order.customer_email,
            subject: `Din bestilling ${order.order_number} er klar for henting`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglumgård</h1></div>
    <div class="content">
      <h2>Din bestilling er klar! 🎉</h2>
      <p>Hei ${order.customer_name},</p>
      <p>Din bestilling <strong>${order.order_number}</strong> er nå klar for henting!</p>
      <p><strong>Neste steg:</strong></p>
      <ul>
        <li>Ta med kjølebag eller kjøleboks</li>
        <li>Hent ordren din i henhold til avtalt tid og sted</li>
        <li>Se detaljer på <a href="${appUrl}/min-side">Min Side</a></li>
      </ul>
      <p>Vi gleder oss til å se deg!</p>
      <p>Vennlig hilsen,<br>Tinglumgård</p>
    </div>
  </div>
</body>
</html>
            `,
          });
        } catch (emailError) {
          console.error(`Failed to send ready email to ${order.customer_email}:`, emailError);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    updated: data.length,
    orders: data,
  });
}

async function bulkSendEmail(orderIds: string[], subject: string, message: string) {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('customer_name, customer_email, order_number')
    .in('id', orderIds);

  if (error) throw error;

  const results = [];
  for (const order of orders) {
    if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
      try {
        await sendEmail({
          to: order.customer_email,
          subject: subject.replace('{ORDER_NUMBER}', order.order_number),
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglumgård</h1></div>
    <div class="content">
      <p>Hei ${order.customer_name},</p>
      ${message.replace('{ORDER_NUMBER}', order.order_number).replace('{CUSTOMER_NAME}', order.customer_name)}
      <p>Vennlig hilsen,<br>Tinglumgård</p>
    </div>
  </div>
</body>
</html>
          `,
        });
        results.push({ order_number: order.order_number, success: true });
      } catch (emailError) {
        console.error(`Failed to send email to ${order.customer_email}:`, emailError);
        results.push({ order_number: order.order_number, success: false, error: emailError });
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

async function bulkLockOrders(orderIds: string[]) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ locked_at: now })
    .in('id', orderIds)
    .is('locked_at', null)
    .select();

  if (error) throw error;

  // Send lock notification emails
  for (const order of data) {
    if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
        await sendEmail({
          to: order.customer_email,
          subject: `Ordre ${order.order_number} låst - Ferdigstilt`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglumgård</h1></div>
    <div class="content">
      <h2>Ordre låst og ferdigstilt</h2>
      <p>Hei ${order.customer_name},</p>
      <p>Din ordre <strong>${order.order_number}</strong> er nå låst og ferdigstilt.</p>
      <p>Ingen flere endringer kan gjøres. Vi klargjør okseboksen din for henting/levering.</p>
      <p>Du vil motta beskjed når bestillingen din er klar.</p>
      <p>Takk for din bestilling!</p>
      <p>Vennlig hilsen,<br>Tinglumgård</p>
    </div>
  </div>
</body>
</html>
          `,
        });
      } catch (emailError) {
        console.error(`Failed to send lock email to ${order.customer_email}:`, emailError);
      }
    }
  }

  return NextResponse.json({
    success: true,
    locked: data.length,
  });
}

async function exportProductionList(orderIds: string[]) {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, mangalitsa_preset:mangalitsa_box_presets(id, slug, name_no, name_en, target_weight_kg)')
    .in('id', orderIds)
    .order('delivery_type', { ascending: true });

  if (error) throw error;

  const normalizedOrders = (orders || []).map((order) => ({
    ...order,
    effective_box_size: getEffectiveBoxSize(order),
  }));

  // Aggregate production data
  const production = {
    boxes: {
      '8kg': normalizedOrders.filter((o) => o.effective_box_size === 8).length,
      '9kg': normalizedOrders.filter((o) => o.effective_box_size === 9).length,
      '10kg': normalizedOrders.filter((o) => o.effective_box_size === 10).length,
      '12kg': normalizedOrders.filter((o) => o.effective_box_size === 12).length,
      total_kg: normalizedOrders.reduce((sum, o) => sum + o.effective_box_size, 0),
    },
    ribbe: normalizedOrders.reduce((acc, o) => {
      acc[o.ribbe_choice] = (acc[o.ribbe_choice] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    delivery: normalizedOrders.reduce((acc, o) => {
      acc[o.delivery_type] = (acc[o.delivery_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    fresh_vs_frozen: {
      fresh: normalizedOrders.filter((o) => o.fresh_delivery).length,
      frozen: normalizedOrders.filter((o) => !o.fresh_delivery).length,
    },
    extras: normalizedOrders.reduce((acc, o) => {
      if (o.extra_products && Array.isArray(o.extra_products)) {
        o.extra_products.forEach((extra: any) => {
          if (!acc[extra.name]) {
            acc[extra.name] = { quantity: 0, unit: extra.unit_type };
          }
          acc[extra.name].quantity += extra.quantity;
        });
      }
      return acc;
    }, {} as Record<string, any>),
  };

  return NextResponse.json({
    success: true,
    production,
    orders: normalizedOrders.map((o) => ({
      order_number: o.order_number,
      customer_name: o.customer_name,
      box_size: o.effective_box_size,
      mangalitsa_preset_name: o.mangalitsa_preset?.name_no || o.mangalitsa_preset?.name_en || null,
      ribbe_choice: o.ribbe_choice,
      delivery_type: o.delivery_type,
      fresh_delivery: o.fresh_delivery,
      extra_products: o.extra_products,
      notes: o.notes,
    })),
  });
}
