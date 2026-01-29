import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'send_individual':
        return await sendIndividualEmail(data.orderId, data.subject, data.message);

      case 'send_bulk':
        return await sendBulkEmail(data.orderIds, data.subject, data.message);

      case 'send_to_all':
        return await sendToAllCustomers(data.subject, data.message, data.filter);

      case 'get_templates':
        return getEmailTemplates();

      case 'get_history':
        return await getEmailHistory(data.orderId);

      case 'get_all_history':
        return await getAllEmailHistory();

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Communication error:', error);
    return NextResponse.json(
      { error: 'Communication operation failed' },
      { status: 500 }
    );
  }
}

async function sendIndividualEmail(orderId: string, subject: string, message: string) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('customer_name, customer_email, order_number')
    .eq('id', orderId)
    .single();

  if (error) throw error;

  if (!order.customer_email || order.customer_email === 'pending@vipps.no') {
    return NextResponse.json({ error: 'No valid email address' }, { status: 400 });
  }

  try {
    await sendEmail({
      to: order.customer_email,
      subject: subject.replace('{ORDER_NUMBER}', order.order_number),
      html: buildEmailHTML(order.customer_name, message, order.order_number),
    });

    // Log email history
    await supabaseAdmin.from('email_log').insert({
      order_id: orderId,
      recipient: order.customer_email,
      subject,
      message,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (emailError) {
    console.error('Failed to send email:', emailError);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

async function sendBulkEmail(orderIds: string[], subject: string, message: string) {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, customer_email, order_number')
    .in('id', orderIds);

  if (error) throw error;

  const results = [];
  for (const order of orders) {
    if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
      try {
        await sendEmail({
          to: order.customer_email,
          subject: subject.replace('{ORDER_NUMBER}', order.order_number),
          html: buildEmailHTML(order.customer_name, message, order.order_number),
        });

        // Log email history
        await supabaseAdmin.from('email_log').insert({
          order_id: order.id,
          recipient: order.customer_email,
          subject,
          message,
          sent_at: new Date().toISOString(),
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

function getEmailTemplates() {
  const templates = [
    {
      id: 'deposit_reminder',
      name: 'Påminnelse om depositum',
      subject: 'Påminnelse: Depositum for ordre {ORDER_NUMBER}',
      message: `<p>Hei {CUSTOMER_NAME},</p>
<p>Dette er en vennlig påminnelse om at depositum for din ordre <strong>{ORDER_NUMBER}</strong> ikke er betalt ennå.</p>
<p>Vennligst fullfør betalingen for å sikre din bestilling.</p>`,
    },
    {
      id: 'remainder_reminder',
      name: 'Påminnelse om restbeløp',
      subject: 'Påminnelse: Restbeløp for ordre {ORDER_NUMBER}',
      message: `<p>Hei {CUSTOMER_NAME},</p>
<p>Din ordre <strong>{ORDER_NUMBER}</strong> nærmer seg leveringsdato.</p>
<p>Vennligst betal restbeløpet for å fullføre din bestilling.</p>`,
    },
    {
      id: 'ready_for_pickup',
      name: 'Klar for henting',
      subject: 'Din bestilling {ORDER_NUMBER} er klar!',
      message: `<p>Hei {CUSTOMER_NAME},</p>
<p>Glede nyheter! Din bestilling <strong>{ORDER_NUMBER}</strong> er nå klar for henting.</p>
<p>Husk å ta med kjølebag eller kjøleboks.</p>`,
    },
    {
      id: 'custom_message',
      name: 'Tilpasset melding',
      subject: 'Oppdatering om ordre {ORDER_NUMBER}',
      message: `<p>Hei {CUSTOMER_NAME},</p>
<p>Vi ønsket å informere deg om din ordre <strong>{ORDER_NUMBER}</strong>.</p>
<p>[Skriv din melding her]</p>`,
    },
  ];

  return NextResponse.json({ templates });
}

async function sendToAllCustomers(subject: string, message: string, filter?: { status?: string; has_email?: boolean }) {
  let query = supabaseAdmin
    .from('orders')
    .select('id, customer_name, customer_email, order_number, status');

  // Apply filters
  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // Filter out orders without valid emails
  const validOrders = orders.filter(
    (order: any) => order.customer_email && order.customer_email !== 'pending@vipps.no'
  );

  // Get unique emails (one email per customer)
  const uniqueEmails = new Map<string, any>();
  validOrders.forEach((order: any) => {
    if (!uniqueEmails.has(order.customer_email)) {
      uniqueEmails.set(order.customer_email, order);
    }
  });

  const results = [];
  for (const [email, order] of Array.from(uniqueEmails.entries())) {
    try {
      await sendEmail({
        to: email,
        subject: subject.replace('{ORDER_NUMBER}', order.order_number),
        html: buildEmailHTML(order.customer_name, message, order.order_number),
      });

      // Log email history
      await supabaseAdmin.from('email_log').insert({
        order_id: order.id,
        recipient: email,
        subject,
        message,
        sent_at: new Date().toISOString(),
      });

      results.push({ email, success: true });
    } catch (emailError) {
      console.error(`Failed to send email to ${email}:`, emailError);
      results.push({ email, success: false, error: emailError });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    total_customers: uniqueEmails.size,
    results,
  });
}

async function getEmailHistory(orderId: string) {
  const { data: history, error } = await supabaseAdmin
    .from('email_log')
    .select('*')
    .eq('order_id', orderId)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Error fetching email history:', error);
    return NextResponse.json({ history: [] });
  }

  return NextResponse.json({ history: history || [] });
}

async function getAllEmailHistory() {
  const { data: history, error } = await supabaseAdmin
    .from('email_log')
    .select(`
      *,
      orders (
        order_number,
        customer_name,
        status
      )
    `)
    .order('sent_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching all email history:', error);
    return NextResponse.json({ history: [] });
  }

  return NextResponse.json({ history: history || [] });
}

function buildEmailHTML(customerName: string, message: string, orderNumber: string): string {
  const personalizedMessage = message
    .replace(/{CUSTOMER_NAME}/g, customerName)
    .replace(/{ORDER_NUMBER}/g, orderNumber);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tinglumgård</h1>
    </div>
    <div class="content">
      ${personalizedMessage}
      <p style="margin-top: 30px;">Vennlig hilsen,<br><strong>Tinglumgård</strong></p>
    </div>
    <div class="footer">
      <p>Tinglumgård | Kvalitetsokse fra gården</p>
    </div>
  </div>
</body>
</html>
  `;
}
