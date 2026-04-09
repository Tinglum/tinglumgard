import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { getEmailDispatchSettings } from '@/lib/email/queue';
import {
  getEmailSchemaStatus,
  isMissingEmailRelationError,
} from '@/lib/email/schema';
import { getSupportReplyAddress } from '@/lib/messages/reply-address';

type CountQueryResult = { count: number | null; error: unknown };

type WebhookHealth = {
  url: string;
  ok: boolean;
  status: number | null;
  error: string | null;
};

function extractMailbox(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function appendWebhookPath(baseUrl: string, path: string) {
  try {
    const url = new URL(baseUrl);
    url.pathname = path;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    const sanitizedBase = String(baseUrl || '').trim().replace(/\/+$/, '');
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${sanitizedBase}${sanitizedPath}`;
  }
}

function resolvePublicReplyWebhookUrl() {
  const publicBase = String(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || ''
  ).trim();

  if (!publicBase) return null;
  return appendWebhookPath(publicBase, '/api/webhooks/email-reply');
}

function resolveOperationalReplyWebhookUrl() {
  const configuredUrl = String(
    process.env.MAILGUN_REPLY_WEBHOOK_URL ||
      process.env.EMAIL_REPLY_WEBHOOK_URL ||
      process.env.INBOUND_EMAIL_WEBHOOK_URL ||
      ''
  ).trim();

  if (configuredUrl) {
    if (configuredUrl.includes('/api/webhooks/email-reply')) {
      return configuredUrl;
    }
    return appendWebhookPath(configuredUrl, '/api/webhooks/email-reply');
  }

  return 'https://main--tinglum.netlify.app/api/webhooks/email-reply';
}

async function checkWebhookHealth(url: string | null): Promise<WebhookHealth | null> {
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    return {
      url,
      ok: response.ok,
      status: response.status,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      url,
      ok: false,
      status: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

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
  supportReplyMode: 'portal_only' | 'email_inbox';
  envStatus: {
    emailReplyTo: boolean;
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
  supportReplyUsesDedicatedMailbox: boolean;
  generalReplyMatchesSender: boolean;
  publicReplyWebhookHealthy: boolean | null;
  operationalReplyWebhookHealthy: boolean | null;
  publicReplyWebhookDiffersFromOperational: boolean;
}) {
  if (input.supportReplyMode !== 'portal_only') {
    if (
      input.publicReplyWebhookHealthy === false &&
      input.operationalReplyWebhookHealthy === true &&
      input.publicReplyWebhookDiffersFromOperational
    ) {
      return 'Public reply webhook is unreachable while the operational webhook is healthy';
    }
    if (input.operationalReplyWebhookHealthy === false) {
      return 'Operational inbound reply webhook is unreachable';
    }
    if (!input.envStatus.emailReplyTo) return 'EMAIL_REPLY_TO missing';
    if (input.generalReplyMatchesSender) return 'General Reply-To matches sender mailbox';
    if (!input.supportReplyUsesDedicatedMailbox) return 'Support replies do not use a dedicated inbox';
  }
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
  const supportReplyMode: 'portal_only' | 'email_inbox' = 'portal_only';

  const settings = await getEmailDispatchSettings(true);
  const schemaStatus = await getEmailSchemaStatus();
  const senderAddress = extractMailbox(settings.defaultFrom);
  const generalReplyAddress = extractMailbox(settings.defaultReplyTo);
  const supportReplyAddress = getSupportReplyAddress({
    configuredReplyTo: settings.defaultReplyTo,
    configuredFrom: settings.defaultFrom,
    mailDomain: process.env.MAILGUN_DOMAIN,
  });
  const supportReplyUsesDedicatedMailbox = Boolean(
    supportReplyAddress && senderAddress && supportReplyAddress !== senderAddress
  );
  const supportReplyOverridesGeneralReplyTo = Boolean(
    supportReplyAddress &&
      generalReplyAddress &&
      supportReplyAddress !== generalReplyAddress
  );

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
    mailgunReplyWebhookUrl: Boolean(
      process.env.MAILGUN_REPLY_WEBHOOK_URL ||
        process.env.EMAIL_REPLY_WEBHOOK_URL ||
        process.env.INBOUND_EMAIL_WEBHOOK_URL
    ),
    emailReplyTo: Boolean(process.env.EMAIL_REPLY_TO),
    cronSecret: Boolean(process.env.CRON_SECRET),
    nextPublicAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  const publicReplyWebhookUrl = resolvePublicReplyWebhookUrl();
  const operationalReplyWebhookUrl = resolveOperationalReplyWebhookUrl();
  const [publicReplyWebhookHealth, operationalReplyWebhookHealth] = await Promise.all([
    checkWebhookHealth(publicReplyWebhookUrl),
    checkWebhookHealth(operationalReplyWebhookUrl),
  ]);
  const publicReplyWebhookDiffersFromOperational = Boolean(
    publicReplyWebhookUrl &&
      operationalReplyWebhookUrl &&
      publicReplyWebhookUrl !== operationalReplyWebhookUrl
  );

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
  if (supportReplyMode !== 'portal_only') {
    if (!envStatus.emailReplyTo) {
      diagnosticsCauses.push('EMAIL_REPLY_TO is missing in the environment, so support threads use a computed reply address.');
    }
    if (
      publicReplyWebhookHealth &&
      operationalReplyWebhookHealth &&
      publicReplyWebhookHealth.ok === false &&
      operationalReplyWebhookHealth.ok === true &&
      publicReplyWebhookDiffersFromOperational
    ) {
      diagnosticsCauses.push(
        `Public reply webhook is unreachable, while the operational webhook is healthy at ${operationalReplyWebhookUrl}.`
      );
    } else if (publicReplyWebhookHealth && publicReplyWebhookHealth.ok === false) {
      diagnosticsCauses.push(
        `Public reply webhook health check failed (${publicReplyWebhookHealth.error || 'unknown error'}).`
      );
    }
    if (operationalReplyWebhookHealth && operationalReplyWebhookHealth.ok === false) {
      diagnosticsCauses.push(
        `Operational reply webhook health check failed (${operationalReplyWebhookHealth.error || 'unknown error'}).`
      );
    }
    if (generalReplyAddress && senderAddress && generalReplyAddress === senderAddress) {
      diagnosticsCauses.push('General Reply-To points to the same mailbox as the sender address.');
    }
    if (!supportReplyUsesDedicatedMailbox) {
      diagnosticsCauses.push('Support messages are not replying to a dedicated messaging inbox.');
    }
  }
  if (!envStatus.cronSecret) diagnosticsCauses.push('CRON_SECRET is missing');
  if (!envStatus.nextPublicAppUrl) diagnosticsCauses.push('NEXT_PUBLIC_APP_URL is missing');
  if (!schemaStatus.ready) diagnosticsCauses.push(`Missing tables: ${schemaStatus.missingTables.join(', ')}`);
  if (settings.mode === 'legacy') diagnosticsCauses.push('Dispatch mode is legacy (use active in production)');
  if (settings.paused) diagnosticsCauses.push('Dispatch worker is paused');
  if (!latestFlowRun) diagnosticsCauses.push('No flow run has been recorded yet');
  if (latestRunAgeMinutes !== null && latestRunAgeMinutes > 30) {
    diagnosticsCauses.push(`Latest flow run is stale (${latestRunAgeMinutes} min ago)`);
  }
  if (latestFlowRun?.error) diagnosticsCauses.push(`Latest flow run failed: ${String(latestFlowRun.error)}`);

  const suggestedFixes: string[] = [];
  if (!envStatus.cronSecret) {
    suggestedFixes.push('Set CRON_SECRET in both hosting environment variables and GitHub Secrets.');
  }
  if (!envStatus.nextPublicAppUrl) {
    suggestedFixes.push('Set NEXT_PUBLIC_APP_URL to the production domain, for example https://tinglumgard.no.');
  }
  if (supportReplyMode !== 'portal_only') {
    if (!envStatus.emailReplyTo) {
      suggestedFixes.push(`Set EMAIL_REPLY_TO to ${supportReplyAddress} in production.`);
    }
    if (
      publicReplyWebhookHealth &&
      operationalReplyWebhookHealth &&
      publicReplyWebhookHealth.ok === false &&
      operationalReplyWebhookHealth.ok === true &&
      publicReplyWebhookDiffersFromOperational
    ) {
      suggestedFixes.push(
        `Update the Mailgun inbound route target to ${operationalReplyWebhookUrl}.`
      );
    } else if (operationalReplyWebhookHealth && operationalReplyWebhookHealth.ok === false) {
      suggestedFixes.push(
        `Verify that ${operationalReplyWebhookUrl} is publicly reachable and returns 200 for GET /api/webhooks/email-reply.`
      );
    }
    if (generalReplyAddress && senderAddress && generalReplyAddress === senderAddress) {
      suggestedFixes.push(`Use a dedicated support reply-to mailbox, for example ${supportReplyAddress}.`);
    }
  }
  if (!schemaStatus.ready) {
    suggestedFixes.push('Run the missing unified email migrations in the production database.');
  }
  if (settings.mode === 'legacy') {
    suggestedFixes.push('Switch dispatch mode to active once environment and migrations are verified.');
  }
  if (settings.paused) {
    suggestedFixes.push('Unpause the dispatch worker.');
  }
  if ((pendingCount || 0) > 0 && latestRunAgeMinutes !== null && latestRunAgeMinutes > 10) {
    suggestedFixes.push('Verify cron runs every minute and that the token is sent in both header and query.');
  }

  const primaryCause = inferPrimaryCause({
    supportReplyMode,
    envStatus: {
      emailReplyTo: envStatus.emailReplyTo,
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
    supportReplyUsesDedicatedMailbox,
    generalReplyMatchesSender: Boolean(
      generalReplyAddress && senderAddress && generalReplyAddress === senderAddress
    ),
    publicReplyWebhookHealthy: publicReplyWebhookHealth?.ok ?? null,
    operationalReplyWebhookHealthy: operationalReplyWebhookHealth?.ok ?? null,
    publicReplyWebhookDiffersFromOperational,
  });

  return NextResponse.json({
    settings,
    envStatus,
    schemaStatus,
    suppressionList: suppressions || [],
    suppressionUnavailable,
    diagnostics: {
      supportReplyMode,
      senderAddress,
      generalReplyAddress,
      supportReplyAddress,
      supportReplyUsesDedicatedMailbox,
      supportReplyOverridesGeneralReplyTo,
      publicReplyWebhookUrl,
      operationalReplyWebhookUrl,
      publicReplyWebhookHealth,
      operationalReplyWebhookHealth,
      mailgunRouteLikelyMisconfigured: Boolean(
        publicReplyWebhookHealth &&
          operationalReplyWebhookHealth &&
          publicReplyWebhookHealth.ok === false &&
          operationalReplyWebhookHealth.ok === true &&
          publicReplyWebhookDiffersFromOperational
      ),
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
