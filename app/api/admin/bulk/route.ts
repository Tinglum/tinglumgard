import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { getEffectiveBoxSize } from '@/lib/orders/display';

function getDeliveryLabel(deliveryType: string) {
  if (deliveryType === 'pickup_farm') return 'Henting på gård';
  if (deliveryType === 'pickup_e6') return 'Henting ved E6';
  if (deliveryType === 'delivery_trondheim') return 'Levering i Trondheim';
  return deliveryType || 'Henting';
}

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

  if (newStatus === 'ready_for_pickup') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no';

    for (const order of data) {
      if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const rendered = await renderManagedTemplate({
            templateKey: 'pig.order.ready_for_pickup',
            locale: 'no',
            variables: {
              customer_name: order.customer_name || 'Kunde',
              order_number: order.order_number,
              delivery_label: getDeliveryLabel(order.delivery_type),
              order_url: buildCustomerOrderLink(appUrl, 'pig', String(order.id)),
            },
          });

          if (!rendered) continue;

          await dispatchEmail({
            to: order.customer_email,
            subject: rendered.subject,
            html: rendered.html,
            classification: 'transactional',
            templateKey: rendered.templateKey,
            sourcePath: '/api/admin/bulk',
            orderId: order.id,
          });
        } catch {
          // Continue sending to next recipient
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
    .select('id, customer_name, customer_email, order_number')
    .in('id', orderIds);

  if (error) throw error;

  const results = [];
  for (const order of orders) {
    if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
      try {
        await dispatchEmail({
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
    <div class="header"><h1>Tinglumgard</h1></div>
    <div class="content">
      <p>Hei ${order.customer_name},</p>
      ${message.replace('{ORDER_NUMBER}', order.order_number).replace('{CUSTOMER_NAME}', order.customer_name)}
      <p>Vennlig hilsen,<br>Tinglumgard</p>
    </div>
  </div>
</body>
</html>
          `,
          classification: 'support',
          sourcePath: '/api/admin/bulk',
          orderId: order.id,
        });
        results.push({ order_number: order.order_number, success: true });
      } catch (emailError) {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no';

  for (const order of data) {
    if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
      try {
        const rendered = await renderManagedTemplate({
          templateKey: 'pig.order.locked.finalized',
          locale: 'no',
          variables: {
            customer_name: order.customer_name || 'Kunde',
            order_number: order.order_number,
            order_url: buildCustomerOrderLink(appUrl, 'pig', String(order.id)),
          },
        });

        if (!rendered) continue;

        await dispatchEmail({
          to: order.customer_email,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'transactional',
          templateKey: rendered.templateKey,
          sourcePath: '/api/admin/bulk',
          orderId: order.id,
        });
      } catch {
        // Continue sending to next recipient
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

