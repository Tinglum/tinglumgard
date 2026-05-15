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
      .from('chicken_waitlist')
      .select('*, chicken_breeds(id, name), chicken_hatches(id, pickup_week, pickup_year)')
      .order('created_at', { ascending: true });

    if (error) {
      logError('admin-chicken-waitlist-fetch', error);
      return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
    }

    return NextResponse.json({ waitlist: data || [] });
  } catch (error) {
    logError('admin-chicken-waitlist-get', error);
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
        return await notifyWaitlistEntries(waitlistIds);
      case 'expire':
        return await expireWaitlistEntries(waitlistIds);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logError('admin-chicken-waitlist-post', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function notifyWaitlistEntries(waitlistIds: string[]) {
  const { data: entries, error } = await supabaseAdmin
    .from('chicken_waitlist')
    .select('*, chicken_breeds(id, name)')
    .in('id', waitlistIds)
    .eq('status', 'waiting');

  if (error || !entries) {
    logError('admin-chicken-waitlist-notify-fetch', error);
    return NextResponse.json({ error: 'Failed to fetch waitlist entries' }, { status: 500 });
  }

  const appUrl = APP_BASE_URL;
  let notified = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const breedName = (entry.chicken_breeds as any)?.name || 'kylling';
    const customerName = entry.name || entry.email;
    const checkoutLink = `${appUrl}/kylling/bestill`;

    try {
      const rendered = await renderManagedTemplate({
        templateKey: 'chicken.waitlist.spot_available',
        locale: 'no',
        variables: {
          customer_name: customerName,
          breed_name: breedName,
          checkout_link: checkoutLink,
        },
      });

      const subject = rendered?.subject ?? `Plass tilgjengelig – ${breedName}`;
      const html = rendered?.html ?? buildWaitlistNotifyHtml({ customerName, breedName, checkoutLink });

      await dispatchEmail({
        to: entry.email,
        subject,
        html,
        classification: 'transactional',
        templateKey: rendered?.templateKey ?? 'chicken.waitlist.spot_available',
        sourcePath: '/api/admin/chickens/waitlist',
      });

      await supabaseAdmin
        .from('chicken_waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
          notify_attempts: (entry.notify_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      notified += 1;
    } catch (emailError) {
      logError('admin-chicken-waitlist-notify-email', emailError);
      errors.push(entry.email);

      // Still increment attempt count even if email failed
      await supabaseAdmin
        .from('chicken_waitlist')
        .update({
          notify_attempts: (entry.notify_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id);
    }
  }

  return NextResponse.json({
    success: true,
    notified,
    errors: errors.length > 0 ? errors : undefined,
  });
}

async function expireWaitlistEntries(waitlistIds: string[]) {
  const { error } = await supabaseAdmin
    .from('chicken_waitlist')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .in('id', waitlistIds);

  if (error) {
    logError('admin-chicken-waitlist-expire', error);
    return NextResponse.json({ error: 'Failed to expire entries' }, { status: 500 });
  }

  return NextResponse.json({ success: true, expired: waitlistIds.length });
}

function buildWaitlistNotifyHtml(params: {
  customerName: string;
  breedName: string;
  checkoutLink: string;
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
<div class="title">Plass tilgjengelig – ${params.breedName}</div>
<p>Hei ${params.customerName},</p>
<p>Det har blitt ledig plass for <strong>${params.breedName}</strong>. Bestill nå før plassen er tatt.</p>
<p><a class="button" href="${params.checkoutLink}">Bestill nå</a></p>
</div></div>
</body></html>`;
}
