import { evaluateEmailConsent } from '@/lib/email/consent';
import { sendViaMailgun } from '@/lib/email/provider-mailgun';
import {
  buildEmailIdempotencyKey,
  countSentLastMinute,
  enqueueEmailRecord,
  fetchDueQueueEntries,
  getEmailDispatchSettings,
  lockQueueEntry,
  markQueueEntryFailed,
  markQueueEntrySent,
  recoverStaleProcessingLocks,
} from '@/lib/email/queue';
import { ensureHtmlDocument, htmlToPlainText } from '@/lib/email/render';
import type { DispatchEmailInput, DispatchEmailResult } from '@/lib/email/types';

function inferIdempotency(input: DispatchEmailInput): {
  source: string;
  entity: string;
  id: string;
  template?: string;
} {
  if (input.idempotency) return input.idempotency;
  if (input.entityType && input.entityId) {
    return {
      source: input.sourcePath || 'flow',
      entity: input.entityType,
      id: input.entityId,
      template: input.templateKey || input.flowKey || 'flow',
    };
  }
  if (input.campaignId) {
    return {
      source: input.sourcePath || 'campaign',
      entity: 'campaign',
      id: input.campaignId,
      template: input.templateKey || 'campaign',
    };
  }
  if (input.customerMessageId) {
    return {
      source: input.sourcePath || 'support',
      entity: 'customer_message',
      id: input.customerMessageId,
      template: input.templateKey || 'support',
    };
  }
  if (input.orderId || input.eggOrderId || input.chickenOrderId) {
    return {
      source: input.sourcePath || 'order',
      entity: input.orderId ? 'order' : input.eggOrderId ? 'egg_order' : 'chicken_order',
      id: input.orderId || input.eggOrderId || input.chickenOrderId || 'unknown',
      template: input.templateKey || 'transactional',
    };
  }
  return {
    source: input.sourcePath || 'generic',
    entity: 'email',
    id: 'generic',
    template: input.templateKey || 'manual',
  };
}

function buildDispatchMetadata(input: DispatchEmailInput): Record<string, unknown> {
  return {
    product_scope: input.productScope || 'shared',
    flow_key: input.flowKey || null,
    trigger_date_key: input.triggerDateKey || null,
    scheduled_for: input.scheduledFor || null,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    missing_email_alert: false,
    ...(input.metadata || {}),
  };
}

function normalizeErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error);
}

function isMissingEmailSchemaError(error: unknown): boolean {
  const message = normalizeErrorMessage(error).toLowerCase();
  const code = String((error as { code?: unknown })?.code || '').toLowerCase();

  return (
    code === '42p01' ||
    code === 'pgrst205' ||
    message.includes("could not find the table 'public.email_") ||
    message.includes('relation') && message.includes('does not exist')
  );
}

async function sendLegacyDirect(input: {
  to: string;
  subject: string;
  html: string;
  settings: { defaultFrom: string; defaultReplyTo: string };
}): Promise<DispatchEmailResult> {
  const sendResult = await sendViaMailgun({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: htmlToPlainText(input.html),
    from: input.settings.defaultFrom,
    replyTo: input.settings.defaultReplyTo,
  });

  if (sendResult.success) {
    return {
      success: true,
      mode: 'legacy',
      id: sendResult.id,
    };
  }

  return {
    success: false,
    mode: 'legacy',
    error: sendResult.error || 'Failed to send email',
  };
}

export async function dispatchEmail(input: DispatchEmailInput): Promise<DispatchEmailResult> {
  const classification = input.classification || 'transactional';
  const locale = input.locale || 'no';
  const html = ensureHtmlDocument(input.html, locale);
  const metadata = buildDispatchMetadata(input);
  const idParts = inferIdempotency(input);
  const idempotencyKey = buildEmailIdempotencyKey({
    source: idParts.source,
    entity: idParts.entity,
    id: idParts.id,
    template: idParts.template,
    toEmail: input.to,
    subject: input.subject,
    html,
  });

  const settings = await getEmailDispatchSettings();

  const consent = await evaluateEmailConsent({
    toEmail: input.to,
    toPhone: input.toPhone || null,
    classification,
  });

  if (!consent.allowed) {
    let queueId: string | undefined;
    try {
      const queue = await enqueueEmailRecord({
        idempotencyKey,
        classification,
        toEmail: input.to,
        toPhone: input.toPhone || null,
        locale,
        templateKey: input.templateKey,
        subject: input.subject,
        html,
        metadata: {
          ...metadata,
          consent_blocked: true,
          consent_reason: consent.reason || null,
        },
        sourcePath: input.sourcePath,
        campaignId: input.campaignId,
        orderId: input.orderId,
        eggOrderId: input.eggOrderId,
        chickenOrderId: input.chickenOrderId,
        customerMessageId: input.customerMessageId,
        priority: input.priority,
        maxAttempts: input.maxAttempts || 6,
        status: 'cancelled',
        lastError: `Consent blocked: ${consent.reason || 'unknown'}`,
        nextAttemptAt: new Date().toISOString(),
      });
      queueId = queue.record.id;
    } catch (error) {
      if (!isMissingEmailSchemaError(error)) {
        throw error;
      }
      // Legacy projects without the unified email schema still need consent-safe behavior.
    }

    return {
      success: true,
      mode: settings.mode,
      queueId,
      skipped: true,
      skipReason: consent.reason || 'consent_blocked',
    };
  }

  if (settings.mode === 'active' || (settings.mode === 'legacy' && settings.paused)) {
    const queue = await enqueueEmailRecord({
      idempotencyKey,
      classification,
      toEmail: input.to,
      toPhone: input.toPhone || null,
      locale,
      templateKey: input.templateKey,
      subject: input.subject,
      html,
      metadata,
      sourcePath: input.sourcePath,
      campaignId: input.campaignId,
      orderId: input.orderId,
      eggOrderId: input.eggOrderId,
      chickenOrderId: input.chickenOrderId,
      customerMessageId: input.customerMessageId,
      priority: input.priority,
      maxAttempts: input.maxAttempts || 6,
      status: 'pending',
    });

    return {
      success: true,
      mode: settings.mode,
      queueId: queue.record.id,
    };
  }

  if (settings.mode === 'shadow') {
    const queue = await enqueueEmailRecord({
      idempotencyKey,
      classification,
      toEmail: input.to,
      toPhone: input.toPhone || null,
      locale,
      templateKey: input.templateKey,
      subject: input.subject,
      html,
      metadata: {
        ...metadata,
        dispatch_mode: 'shadow',
        would_send: true,
      },
      sourcePath: input.sourcePath,
      campaignId: input.campaignId,
      orderId: input.orderId,
      eggOrderId: input.eggOrderId,
      chickenOrderId: input.chickenOrderId,
      customerMessageId: input.customerMessageId,
      priority: input.priority,
      maxAttempts: input.maxAttempts || 6,
      status: 'sent',
      sentAt: new Date().toISOString(),
      providerMessageId: 'shadow:would_send',
    });

    return {
      success: true,
      mode: settings.mode,
      queueId: queue.record.id,
      skipped: true,
      skipReason: 'shadow_mode',
    };
  }

  let queued: Awaited<ReturnType<typeof enqueueEmailRecord>> | null = null;
  try {
    queued = await enqueueEmailRecord({
      idempotencyKey,
      classification,
      toEmail: input.to,
      toPhone: input.toPhone || null,
      locale,
      templateKey: input.templateKey,
      subject: input.subject,
      html,
      metadata,
      sourcePath: input.sourcePath,
      campaignId: input.campaignId,
      orderId: input.orderId,
      eggOrderId: input.eggOrderId,
      chickenOrderId: input.chickenOrderId,
      customerMessageId: input.customerMessageId,
      priority: input.priority,
      maxAttempts: input.maxAttempts || 6,
      status: 'processing',
      lockedAt: new Date().toISOString(),
      lockedBy: 'legacy-sync-dispatch',
    });
  } catch (error) {
    if (!isMissingEmailSchemaError(error)) {
      throw error;
    }

    // Fallback for environments where unified email tables are not migrated yet.
    return sendLegacyDirect({
      to: input.to,
      subject: input.subject,
      html,
      settings,
    });
  }

  if (!queued.inserted && queued.record.status === 'sent') {
    return {
      success: true,
      mode: settings.mode,
      queueId: queued.record.id,
      id: queued.record.provider_message_id || undefined,
    };
  }

  const attempt = queued.record.attempts + 1;
  const sendResult = await sendViaMailgun({
    to: queued.record.to_email,
    subject: queued.record.subject,
    html: queued.record.html,
    text: htmlToPlainText(queued.record.html),
    from: settings.defaultFrom,
    replyTo: settings.defaultReplyTo,
  });

  if (sendResult.success) {
    await markQueueEntrySent({
      id: queued.record.id,
      attempts: attempt,
      providerMessageId: sendResult.id || null,
    });
    return {
      success: true,
      mode: settings.mode,
      queueId: queued.record.id,
      id: sendResult.id,
    };
  }

  await markQueueEntryFailed({
    id: queued.record.id,
    attempts: attempt,
    maxAttempts: queued.record.max_attempts,
    errorMessage: sendResult.error || 'legacy_send_failed',
  });

  return {
    success: false,
    mode: settings.mode,
    queueId: queued.record.id,
    error: sendResult.error || 'Failed to send email',
  };
}

export async function processEmailDispatchBatch(options?: {
  workerId?: string;
  maxToProcess?: number;
}) {
  const settings = await getEmailDispatchSettings();
  const workerId = options?.workerId || `worker-${Date.now()}`;

  if (settings.mode !== 'active') {
    return {
      ok: true,
      skipped: true,
      reason: `dispatch_mode_${settings.mode}`,
      attempted: 0,
      sent: 0,
      failed: 0,
      dead: 0,
      recoveredLocks: 0,
    };
  }

  if (settings.paused) {
    return {
      ok: true,
      skipped: true,
      reason: 'dispatch_paused',
      attempted: 0,
      sent: 0,
      failed: 0,
      dead: 0,
      recoveredLocks: 0,
    };
  }

  const recoveredLocks = await recoverStaleProcessingLocks();
  const sentLastMinute = await countSentLastMinute();
  const allowance = Math.max(0, settings.rateLimitPerMinute - sentLastMinute);
  const desired = options?.maxToProcess || settings.batchSize;
  const toProcess = Math.min(desired, settings.batchSize, allowance);

  if (toProcess <= 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'rate_limited',
      attempted: 0,
      sent: 0,
      failed: 0,
      dead: 0,
      recoveredLocks,
    };
  }

  const due = await fetchDueQueueEntries(toProcess * 3);
  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let dead = 0;

  for (const candidate of due) {
    if (attempted >= toProcess) break;

    const locked = await lockQueueEntry(candidate.id, workerId);
    if (!locked) continue;

    attempted += 1;
    const attempt = locked.attempts + 1;

    const sendResult = await sendViaMailgun({
      to: locked.to_email,
      subject: locked.subject,
      html: locked.html,
      text: htmlToPlainText(locked.html),
      from: settings.defaultFrom,
      replyTo: settings.defaultReplyTo,
    });

    if (sendResult.success) {
      await markQueueEntrySent({
        id: locked.id,
        attempts: attempt,
        providerMessageId: sendResult.id || null,
      });
      sent += 1;
      continue;
    }

    const failure = await markQueueEntryFailed({
      id: locked.id,
      attempts: attempt,
      maxAttempts: locked.max_attempts,
      errorMessage: sendResult.error || 'provider_send_failed',
    });

    if (failure.status === 'dead') {
      dead += 1;
    } else {
      failed += 1;
    }
  }

  return {
    ok: true,
    skipped: false,
    reason: null,
    attempted,
    sent,
    failed,
    dead,
    recoveredLocks,
  };
}
