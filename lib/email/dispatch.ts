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
import { isMissingEmailRelationError } from '@/lib/email/schema';
import { getSupportReplyAddress } from '@/lib/messages/reply-address';
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
    reply_to: input.replyTo || null,
    headers: input.headers || null,
    ...(input.metadata || {}),
  };
}

function readStoredReplyTo(value: unknown) {
  const replyTo = String(value || '').trim();
  return replyTo || null;
}

function resolveReplyToAddress(input: {
  requestedReplyTo?: unknown;
  classification: string;
  settings: { defaultFrom: string; defaultReplyTo: string };
}) {
  const explicitReplyTo = readStoredReplyTo(input.requestedReplyTo);
  if (explicitReplyTo) {
    return explicitReplyTo;
  }

  if (input.classification === 'support') {
    return getSupportReplyAddress({
      configuredReplyTo: input.settings.defaultReplyTo,
      configuredFrom: input.settings.defaultFrom,
      mailDomain: process.env.MAILGUN_DOMAIN,
    });
  }

  return input.settings.defaultReplyTo;
}

function getDispatchHeaders(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const headers: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(rawValue || '').trim();
    if (!normalizedKey || !normalizedValue) continue;
    headers[normalizedKey] = normalizedValue;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

async function sendLegacyDirect(input: {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string | null;
  classification: string;
  settings: { defaultFrom: string; defaultReplyTo: string };
}): Promise<DispatchEmailResult> {
  const sendResult = await sendViaMailgun({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: htmlToPlainText(input.html),
    from: input.settings.defaultFrom,
    replyTo: resolveReplyToAddress({
      requestedReplyTo: input.replyTo,
      classification: input.classification,
      settings: input.settings,
    }),
    headers: input.headers,
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
      if (!isMissingEmailRelationError(error)) {
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
    try {
      const immediateStatus = input.sendImmediately ? 'processing' : 'pending';
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
        status: immediateStatus,
        ...(input.sendImmediately
          ? { lockedAt: new Date().toISOString(), lockedBy: 'immediate-dispatch' }
          : {}),
      });

      if (input.sendImmediately && queue.inserted) {
        const attempt = queue.record.attempts + 1;
        const sendResult = await sendViaMailgun({
          to: queue.record.to_email,
          subject: queue.record.subject,
          html: queue.record.html,
          text: htmlToPlainText(queue.record.html),
          from: settings.defaultFrom,
          replyTo: resolveReplyToAddress({
            requestedReplyTo: (queue.record.metadata || {}).reply_to,
            classification: queue.record.classification,
            settings,
          }),
          headers: getDispatchHeaders((queue.record.metadata || {}).headers),
        });

        if (sendResult.success) {
          await markQueueEntrySent({
            id: queue.record.id,
            attempts: attempt,
            providerMessageId: sendResult.id || null,
          });
          return {
            success: true,
            mode: settings.mode,
            queueId: queue.record.id,
            id: sendResult.id,
          };
        }

        await markQueueEntryFailed({
          id: queue.record.id,
          attempts: attempt,
          maxAttempts: queue.record.max_attempts,
          errorMessage: sendResult.error || 'immediate_send_failed',
        });
        return {
          success: false,
          mode: settings.mode,
          queueId: queue.record.id,
          error: sendResult.error || 'Failed to send email',
        };
      }

      return {
        success: true,
        mode: settings.mode,
        queueId: queue.record.id,
      };
    } catch (error) {
      if (!isMissingEmailRelationError(error)) {
        throw error;
      }

      if (settings.mode === 'legacy' && settings.paused) {
        return {
          success: true,
          mode: settings.mode,
          skipped: true,
          skipReason: 'queue_schema_missing',
        };
      }

      return sendLegacyDirect({
        to: input.to,
        subject: input.subject,
        html,
        headers: input.headers,
        replyTo: input.replyTo || null,
        classification,
        settings,
      });
    }
  }

  if (settings.mode === 'shadow') {
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
    } catch (error) {
      if (!isMissingEmailRelationError(error)) {
        throw error;
      }

      return {
        success: true,
        mode: settings.mode,
        skipped: true,
        skipReason: 'shadow_schema_missing',
      };
    }
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
    if (!isMissingEmailRelationError(error)) {
      throw error;
    }

    // Fallback for environments where unified email tables are not migrated yet.
    return sendLegacyDirect({
      to: input.to,
      subject: input.subject,
      html,
      headers: input.headers,
      replyTo: input.replyTo || null,
      classification,
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
    replyTo: resolveReplyToAddress({
      requestedReplyTo: (queued.record.metadata || {}).reply_to,
      classification: queued.record.classification,
      settings,
    }),
    headers: getDispatchHeaders((queued.record.metadata || {}).headers),
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
      replyTo: resolveReplyToAddress({
        requestedReplyTo: (locked.metadata || {}).reply_to,
        classification: locked.classification,
        settings,
      }),
      headers: getDispatchHeaders((locked.metadata || {}).headers),
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
