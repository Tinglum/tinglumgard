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
      .from('pork_interest')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logError('admin-orders-interest-fetch', error);
      return NextResponse.json({ error: 'Failed to fetch interest registrations' }, { status: 500 });
    }

    const grouped: Record<string, typeof data> = {
      pending: [],
      contacted: [],
      converted: [],
      declined: [],
    };

    for (const entry of data || []) {
      const status = entry.status as string;
      if (grouped[status]) {
        grouped[status]!.push(entry);
      }
    }

    return NextResponse.json({ interest: data || [], grouped });
  } catch (error) {
    logError('admin-orders-interest-get', error);
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
    const { action, interestIds } = body;

    if (!Array.isArray(interestIds) || interestIds.length === 0) {
      return NextResponse.json({ error: 'interestIds array required' }, { status: 400 });
    }

    switch (action) {
      case 'contact':
        return await contactPorkInterest(interestIds);
      case 'convert':
        return await convertPorkInterest(interestIds);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logError('admin-orders-interest-post', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function contactPorkInterest(interestIds: string[]) {
  const { data: entries, error } = await supabaseAdmin
    .from('pork_interest')
    .select('*')
    .in('id', interestIds)
    .eq('status', 'pending');

  if (error || !entries) {
    logError('admin-orders-interest-contact-fetch', error);
    return NextResponse.json({ error: 'Failed to fetch interest entries' }, { status: 500 });
  }

  const appUrl = APP_BASE_URL;
  let contacted = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const customerName = entry.name || entry.email;
    const orderLink = `${appUrl}/bestill`;

    try {
      const rendered = await renderManagedTemplate({
        templateKey: 'pig.interest.season_open',
        locale: 'no',
        variables: {
          customer_name: customerName,
          order_link: orderLink,
          season_year: entry.season_year ? String(entry.season_year) : '',
          box_size_preference: entry.box_size_preference ? `${entry.box_size_preference} kg` : '',
        },
      });

      const subject = rendered?.subject ?? 'Bestilling åpnet – svinekjøtt';
      const html = rendered?.html ?? buildPorkInterestContactHtml({ customerName, orderLink });

      await dispatchEmail({
        to: entry.email,
        subject,
        html,
        classification: 'transactional',
        templateKey: rendered?.templateKey ?? 'pig.interest.season_open',
        sourcePath: '/api/admin/orders/interest',
      });

      await supabaseAdmin
        .from('pork_interest')
        .update({ status: 'contacted' })
        .eq('id', entry.id);

      contacted += 1;
    } catch (emailError) {
      logError('admin-orders-interest-contact-email', emailError);
      errors.push(entry.email);
    }
  }

  return NextResponse.json({
    success: true,
    contacted,
    errors: errors.length > 0 ? errors : undefined,
  });
}

async function convertPorkInterest(interestIds: string[]) {
  const { error } = await supabaseAdmin
    .from('pork_interest')
    .update({ status: 'converted' })
    .in('id', interestIds);

  if (error) {
    logError('admin-orders-interest-convert', error);
    return NextResponse.json({ error: 'Failed to convert entries' }, { status: 500 });
  }

  return NextResponse.json({ success: true, converted: interestIds.length });
}

function buildPorkInterestContactHtml(params: {
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
<div class="title">Bestilling åpnet – svinekjøtt</div>
<p>Hei ${params.customerName},</p>
<p>Sesongen er åpnet og du kan nå bestille svinekjøtt fra Tinglumgård.</p>
<p><a class="button" href="${params.orderLink}">Bestill nå</a></p>
</div></div>
</body></html>`;
}
