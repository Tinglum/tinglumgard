import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { logError } from '@/lib/logger';
import { APP_BASE_URL } from '@/lib/constants/app';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pork_waitlist')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      logError('admin-orders-waitlist-fetch', error);
      return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
    }

    return NextResponse.json({ waitlist: data || [] });
  } catch (error) {
    logError('admin-orders-waitlist-get', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, waitlistIds } = body;

    if (!Array.isArray(waitlistIds) || waitlistIds.length === 0) {
      return NextResponse.json({ error: 'waitlistIds array required' }, { status: 400 });
    }

    switch (action) {
      case 'notify':
        return await notifyPorkWaitlist(waitlistIds);
      case 'expire':
        return await expirePorkWaitlist(waitlistIds);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logError('admin-orders-waitlist-post', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function notifyPorkWaitlist(waitlistIds: string[]) {
  const { data: entries, error } = await supabaseAdmin
    .from('pork_waitlist')
    .select('*')
    .in('id', waitlistIds)
    .eq('status', 'waiting');

  if (error || !entries) {
    logError('admin-orders-waitlist-notify-fetch', error);
    return NextResponse.json({ error: 'Failed to fetch waitlist entries' }, { status: 500 });
  }

  const appUrl = APP_BASE_URL;
  let notified = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const customerName = entry.name || entry.email;
    const orderLink = `${appUrl}/bestill`;

    try {
      const rendered = await renderManagedTemplate({
        templateKey: 'pig.waitlist.spot_available',
        locale: 'no',
        variables: {
          customer_name: customerName,
          order_link: orderLink,
          box_size_preference: entry.box_size_preference ? `${entry.box_size_preference} kg` : '',
        },
      });

      const subject = rendered?.subject ?? 'Plass tilgjengelig – bestill svinekjøtt nå';
      const html = rendered?.html ?? buildPorkWaitlistNotifyHtml({ customerName, orderLink });

      await dispatchEmail({
        to: entry.email,
        subject,
        html,
        classification: 'transactional',
        templateKey: rendered?.templateKey ?? 'pig.waitlist.spot_available',
        sourcePath: '/api/admin/orders/waitlist',
      });

      await supabaseAdmin
        .from('pork_waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
          notify_attempts: (entry.notify_attempts || 0) + 1,
        })
        .eq('id', entry.id);

      notified += 1;
    } catch (emailError) {
      logError('admin-orders-waitlist-notify-email', emailError);
      errors.push(entry.email);

      await supabaseAdmin
        .from('pork_waitlist')
        .update({ notify_attempts: (entry.notify_attempts || 0) + 1 })
        .eq('id', entry.id);
    }
  }

  return NextResponse.json({
    success: true,
    notified,
    errors: errors.length > 0 ? errors : undefined,
  });
}

async function expirePorkWaitlist(waitlistIds: string[]) {
  const { error } = await supabaseAdmin
    .from('pork_waitlist')
    .update({ status: 'expired' })
    .in('id', waitlistIds);

  if (error) {
    logError('admin-orders-waitlist-expire', error);
    return NextResponse.json({ error: 'Failed to expire entries' }, { status: 500 });
  }

  return NextResponse.json({ success: true, expired: waitlistIds.length });
}

function buildPorkWaitlistNotifyHtml(params: {
  customerName: string;
  orderLink: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #111827; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
.title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
.button { display: inline-block; background: #111827; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; }
</style></head>
<body>
<div class="container"><div class="card">
<div class="title">Plass tilgjengelig – svinekjøtt</div>
<p>Hei ${params.customerName},</p>
<p>Det er nå ledig kapasitet for bestilling av griseboks. Bestill nå før plassen er tatt.</p>
<p><a class="button" href="${params.orderLink}">Bestill nå</a></p>
</div></div>
</body></html>`;
}
