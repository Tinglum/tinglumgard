import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { getEmailDispatchSettings } from '@/lib/email/queue';
import { getEmailSchemaStatus } from '@/lib/email/schema';

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const settings = await getEmailDispatchSettings(true);
  const schemaStatus = await getEmailSchemaStatus();
  const { data: suppressions } = await supabaseAdmin
    .from('email_suppression_list')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const envStatus = {
    mailgunApiKey: Boolean(process.env.MAILGUN_API_KEY),
    mailgunDomain: Boolean(process.env.MAILGUN_DOMAIN),
    mailgunWebhookSigningKey: Boolean(process.env.MAILGUN_WEBHOOK_SIGNING_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    nextPublicAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  return NextResponse.json({
    settings,
    envStatus,
    schemaStatus,
    suppressionList: suppressions || [],
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const updates: Array<{ key: string; value: unknown }> = [];
  const allowedModes = new Set(['legacy', 'shadow', 'active']);
  const allowedSuppressionReasons = new Set(['manual_unsubscribe', 'bounced', 'complaint']);

  if (typeof body?.dispatchMode === 'string') {
    const dispatchMode = body.dispatchMode.trim();
    if (!allowedModes.has(dispatchMode)) {
      return NextResponse.json({ error: 'Invalid dispatch mode' }, { status: 400 });
    }
    updates.push({ key: 'email_dispatch_mode', value: dispatchMode });
  }
  if (typeof body?.dispatchPaused === 'boolean') {
    updates.push({ key: 'email_dispatch_paused', value: body.dispatchPaused });
  }
  if (typeof body?.batchSize === 'number' && Number.isFinite(body.batchSize)) {
    updates.push({ key: 'email_worker_batch_size', value: Math.max(1, Math.round(body.batchSize)) });
  }
  if (typeof body?.rateLimitPerMinute === 'number' && Number.isFinite(body.rateLimitPerMinute)) {
    updates.push({
      key: 'email_rate_limit_per_minute',
      value: Math.max(1, Math.round(body.rateLimitPerMinute)),
    });
  }
  if (typeof body?.defaultFrom === 'string' && body.defaultFrom.trim()) {
    updates.push({ key: 'email_default_from', value: body.defaultFrom.trim() });
  }
  if (typeof body?.defaultReplyTo === 'string' && body.defaultReplyTo.trim()) {
    updates.push({ key: 'email_default_reply_to', value: body.defaultReplyTo.trim() });
  }
  if (typeof body?.campaignSendViaApiCronOnly === 'boolean') {
    updates.push({ key: 'campaign_send_via_api_cron_only', value: body.campaignSendViaApiCronOnly });
  }

  if (updates.length > 0) {
    const { error } = await supabaseAdmin
      .from('app_config')
      .upsert(
        updates.map((item) => ({
          key: item.key,
          value: item.value,
        })),
        { onConflict: 'key' }
      );

    if (error) {
      return NextResponse.json({ error: 'Failed to update setup config' }, { status: 500 });
    }
  }

  if (typeof body?.removeSuppressionEmail === 'string' && body.removeSuppressionEmail.trim()) {
    await supabaseAdmin
      .from('email_suppression_list')
      .delete()
      .ilike('email', body.removeSuppressionEmail.trim().toLowerCase());
  }

  if (typeof body?.addSuppressionEmail === 'string' && body.addSuppressionEmail.trim()) {
    const email = body.addSuppressionEmail.trim().toLowerCase();
    const requestedReason = String(body?.suppressionReason || 'manual_unsubscribe');
    const reason = allowedSuppressionReasons.has(requestedReason)
      ? requestedReason
      : 'manual_unsubscribe';
    const source = String(body?.suppressionSource || 'admin');

    await supabaseAdmin.from('email_suppression_list').upsert(
      {
        email,
        reason,
        source,
      },
      { onConflict: 'email' }
    );
  }

  const settings = await getEmailDispatchSettings(true);
  return NextResponse.json({ success: true, settings });
}
