import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { getEmailDispatchSettings } from '@/lib/email/queue';
import {
  getEmailSchemaStatus,
  isMissingEmailRelationError,
} from '@/lib/email/schema';

type CountQueryResult = { count: number | null; error: unknown };

async function safeCount(query: PromiseLike<CountQueryResult>) {
  try {
    const result = await query;
    if (result.error) return null;
    return Number(result.count || 0);
  } catch {
    return null;
  }
}

function inferPrimaryCause(input: {
  envStatus: {
    cronSecret: boolean;
    nextPublicAppUrl: boolean;
  };
  schemaReady: boolean;
  settingsMode: string;
  paused: boolean;
  latestRunAgeMinutes: number | null;
  latestRunError: string | null;
  queuePending: number | null;
  queueProcessing: number | null;
}): string {
  if (!input.envStatus.cronSecret) return 'CRON_SECRET missing';
  if (!input.envStatus.nextPublicAppUrl) return 'NEXT_PUBLIC_APP_URL missing';
  if (!input.schemaReady) return 'Email schema not fully migrated';
  if (input.settingsMode === 'legacy') return 'Dispatch mode is legacy';
  if (input.paused) return 'Dispatch worker is paused';
  if (input.latestRunError) return 'Latest flow runner failed';
  if (
    (input.queuePending || 0) > 0 &&
    (input.latestRunAgeMinutes === null || input.latestRunAgeMinutes > 10) &&
    (input.queueProcessing || 0) === 0
  ) {
    return 'Queue backlog without active runner';
  }
  return 'No blocking cause detected';
}

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const settings = await getEmailDispatchSettings(true);
  const schemaStatus = await getEmailSchemaStatus();
  const { data: suppressions, error: suppressionsError } = await supabaseAdmin
    .from('email_suppression_list')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  const suppressionUnavailable = Boolean(
    suppressionsError && isMissingEmailRelationError(suppressionsError)
  );

  if (suppressionsError && !suppressionUnavailable) {
    return NextResponse.json({ error: 'Failed to fetch suppression list' }, { status: 500 });
  }

  const envStatus = {
    mailgunApiKey: Boolean(process.env.MAILGUN_API_KEY),
    mailgunDomain: Boolean(process.env.MAILGUN_DOMAIN),
    mailgunWebhookSigningKey: Boolean(process.env.MAILGUN_WEBHOOK_SIGNING_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    nextPublicAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  const flowRunsQuery = await supabaseAdmin
    .from('email_flow_runs')
    .select(
      'id, started_at, finished_at, scanned_count, due_count, enqueued_count, skipped_count, failed_count, completed_count, campaigns_queued_count, missing_email_count, error'
    )
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestFlowRun =
    flowRunsQuery.error && isMissingEmailRelationError(flowRunsQuery.error)
      ? null
      : flowRunsQuery.error
        ? null
        : flowRunsQuery.data || null;

  const [pendingCount, processingCount, failedCount, deadCount, queuedTodayCount, sentTodayCount] =
    await Promise.all([
      safeCount(
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      ),
      safeCount(
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing')
      ),
      safeCount(
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
      ),
      safeCount(
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'dead')
      ),
      safeCount(
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'processing', 'failed'])
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ),
      safeCount(
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ),
    ]);

  const cronUrls = {
    reconcile: '/api/cron/email-flow-reconcile',
    flowRunner: '/api/cron/email-flow-runner',
    dispatch: '/api/cron/email-dispatch',
  };

  const latestRunStartedAt = latestFlowRun?.started_at ? new Date(String(latestFlowRun.started_at)) : null;
  const latestRunFinishedAt = latestFlowRun?.finished_at ? new Date(String(latestFlowRun.finished_at)) : null;
  const latestRunAgeMinutes = latestRunStartedAt
    ? Math.max(0, Math.round((Date.now() - latestRunStartedAt.getTime()) / (60 * 1000)))
    : null;
  const latestRunState =
    latestFlowRun?.error
      ? 'failed'
      : latestRunFinishedAt
        ? 'completed'
        : latestRunStartedAt
          ? 'running'
          : 'unknown';

  const diagnosticsCauses: string[] = [];
  if (!envStatus.cronSecret) diagnosticsCauses.push('CRON_SECRET mangler i miljø');
  if (!envStatus.nextPublicAppUrl) diagnosticsCauses.push('NEXT_PUBLIC_APP_URL mangler i miljø');
  if (!schemaStatus.ready) diagnosticsCauses.push(`Manglende tabeller: ${schemaStatus.missingTables.join(', ')}`);
  if (settings.mode === 'legacy') diagnosticsCauses.push('Dispatch mode står på legacy (bruk active i produksjon)');
  if (settings.paused) diagnosticsCauses.push('Dispatch worker er pauset');
  if (!latestFlowRun) diagnosticsCauses.push('Ingen flow-run registrert ennå');
  if (latestRunAgeMinutes !== null && latestRunAgeMinutes > 30) {
    diagnosticsCauses.push(`Siste flow-run er gammel (${latestRunAgeMinutes} min siden)`);
  }
  if (latestFlowRun?.error) diagnosticsCauses.push(`Siste flow-run feilet: ${String(latestFlowRun.error)}`);

  const suggestedFixes: string[] = [];
  if (!envStatus.cronSecret) {
    suggestedFixes.push('Sett CRON_SECRET i både hosting-miljø og GitHub Secrets.');
  }
  if (!envStatus.nextPublicAppUrl) {
    suggestedFixes.push('Sett NEXT_PUBLIC_APP_URL til produksjonsdomenet (for eksempel https://tinglumgard.no).');
  }
  if (!schemaStatus.ready) {
    suggestedFixes.push('Kjør manglende migrasjoner for unified email-tabellene i produksjonsdatabasen.');
  }
  if (settings.mode === 'legacy') {
    suggestedFixes.push('Bytt dispatch mode til active når miljø og migrasjoner er verifisert.');
  }
  if (settings.paused) {
    suggestedFixes.push('Fjern pause på dispatch worker.');
  }
  if ((pendingCount || 0) > 0 && latestRunAgeMinutes !== null && latestRunAgeMinutes > 10) {
    suggestedFixes.push('Verifiser at cron kjører hvert minutt og at token sendes i både header og query.');
  }

  const primaryCause = inferPrimaryCause({
    envStatus: {
      cronSecret: envStatus.cronSecret,
      nextPublicAppUrl: envStatus.nextPublicAppUrl,
    },
    schemaReady: schemaStatus.ready,
    settingsMode: settings.mode,
    paused: settings.paused,
    latestRunAgeMinutes,
    latestRunError: latestFlowRun?.error ? String(latestFlowRun.error) : null,
    queuePending: pendingCount,
    queueProcessing: processingCount,
  });

  return NextResponse.json({
    settings,
    envStatus,
    schemaStatus,
    suppressionList: suppressions || [],
    suppressionUnavailable,
    diagnostics: {
      cronUrls,
      latestFlowRun,
      latestRunState,
      latestRunAgeMinutes,
      primaryCause,
      queue: {
        pending: pendingCount,
        processing: processingCount,
        failed: failedCount,
        dead: deadCount,
        activeLast24h: queuedTodayCount,
        sentLast24h: sentTodayCount,
      },
      schemaDetails: schemaStatus.details || {},
      causes: diagnosticsCauses,
      suggestedFixes,
    },
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
    const { error } = await supabaseAdmin
      .from('email_suppression_list')
      .delete()
      .ilike('email', body.removeSuppressionEmail.trim().toLowerCase());
    if (error && isMissingEmailRelationError(error)) {
      return NextResponse.json(
        { error: 'Suppression list table is not available in this environment yet' },
        { status: 503 }
      );
    }
  }

  if (typeof body?.addSuppressionEmail === 'string' && body.addSuppressionEmail.trim()) {
    const email = body.addSuppressionEmail.trim().toLowerCase();
    const requestedReason = String(body?.suppressionReason || 'manual_unsubscribe');
    const reason = allowedSuppressionReasons.has(requestedReason)
      ? requestedReason
      : 'manual_unsubscribe';
    const source = String(body?.suppressionSource || 'admin');

    const { error } = await supabaseAdmin.from('email_suppression_list').upsert(
      {
        email,
        reason,
        source,
      },
      { onConflict: 'email' }
    );
    if (error && isMissingEmailRelationError(error)) {
      return NextResponse.json(
        { error: 'Suppression list table is not available in this environment yet' },
        { status: 503 }
      );
    }
  }

  const settings = await getEmailDispatchSettings(true);
  return NextResponse.json({ success: true, settings });
}
