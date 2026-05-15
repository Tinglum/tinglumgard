import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import type {
  EmailDispatchSettings,
  EmailQueueRecord,
  EnqueueEmailInput,
} from '@/lib/email/types';

export const EMAIL_RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 360, 1440];
const STALE_LOCK_MINUTES = 5;

let cachedSettings: { expiresAt: number; value: EmailDispatchSettings } | null = null;

function readJsonString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  return fallback;
}

function readJsonNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readJsonBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

export function buildEmailIdempotencyKey(params: {
  source: string;
  entity: string;
  id: string;
  template?: string;
  toEmail: string;
  subject: string;
  html: string;
}): string {
  const contentHash = crypto
    .createHash('sha256')
    .update(`${normalizeEmail(params.toEmail)}|${params.subject}|${params.html}`)
    .digest('hex')
    .slice(0, 16);

  return `email:${sanitizeSegment(params.source)}:${sanitizeSegment(params.entity)}:${sanitizeSegment(
    params.id
  )}:${sanitizeSegment(params.template || 'none')}:${contentHash}`;
}

export async function getEmailDispatchSettings(forceRefresh = false): Promise<EmailDispatchSettings> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.value;
  }

  const keys = [
    'email_dispatch_mode',
    'email_dispatch_paused',
    'email_worker_batch_size',
    'email_rate_limit_per_minute',
    'email_default_from',
    'email_default_reply_to',
  ];

  const { data } = await supabaseAdmin.from('app_config').select('key, value').in('key', keys);
  const map: Record<string, unknown> = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }

  const value: EmailDispatchSettings = {
    mode: readJsonString(map.email_dispatch_mode, 'legacy') as EmailDispatchSettings['mode'],
    paused: readJsonBoolean(map.email_dispatch_paused, false),
    batchSize: Math.max(1, readJsonNumber(map.email_worker_batch_size, 50)),
    rateLimitPerMinute: Math.max(1, readJsonNumber(map.email_rate_limit_per_minute, 60)),
    defaultFrom: readJsonString(map.email_default_from, process.env.EMAIL_FROM || 'post@tinglum.com'),
    defaultReplyTo: readJsonString(
      map.email_default_reply_to,
      process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || 'post@tinglum.com'
    ),
  };

  cachedSettings = {
    value,
    expiresAt: now + 15_000,
  };

  return value;
}

export async function enqueueEmailRecord(input: EnqueueEmailInput): Promise<{
  record: EmailQueueRecord;
  inserted: boolean;
}> {
  const nowIso = new Date().toISOString();
  const row = {
    idempotency_key: input.idempotencyKey,
    classification: input.classification,
    priority: input.priority ?? 50,
    status: input.status ?? 'pending',
    to_email: normalizeEmail(input.toEmail),
    to_phone: input.toPhone || null,
    locale: input.locale || 'no',
    template_key: input.templateKey || null,
    subject: input.subject,
    html: input.html,
    metadata: input.metadata || {},
    source_path: input.sourcePath || null,
    campaign_id: input.campaignId || null,
    order_id: input.orderId || null,
    egg_order_id: input.eggOrderId || null,
    chicken_order_id: input.chickenOrderId || null,
    customer_message_id: input.customerMessageId || null,
    attempts: input.attempts ?? 0,
    max_attempts: input.maxAttempts ?? 6,
    next_attempt_at: input.nextAttemptAt || nowIso,
    locked_by: input.lockedBy ?? null,
    locked_at: input.lockedAt ?? null,
    sent_at: input.sentAt ?? null,
    provider_message_id: input.providerMessageId ?? null,
    last_error: input.lastError ?? null,
  };

  const { data, error } = await supabaseAdmin.from('email_dispatch_queue').insert(row).select('*').single();

  if (!error && data) {
    return {
      record: data as EmailQueueRecord,
      inserted: true,
    };
  }

  const duplicate = String(error?.message || '').toLowerCase().includes('duplicate');
  if (duplicate) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('email_dispatch_queue')
      .select('*')
      .eq('idempotency_key', input.idempotencyKey)
      .single();

    if (existingError || !existing) {
      throw error || existingError;
    }

    return {
      record: existing as EmailQueueRecord,
      inserted: false,
    };
  }

  throw error;
}

export async function recoverStaleProcessingLocks(): Promise<number> {
  const staleAt = new Date(Date.now() - STALE_LOCK_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .update({
      status: 'failed',
      next_attempt_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: 'Recovered stale processing lock',
    })
    .eq('status', 'processing')
    .lt('locked_at', staleAt)
    .select('id');

  if (error) {
    logError('recoverStaleProcessingLocks', error);
    return 0;
  }

  return data?.length || 0;
}

export async function countSentLastMinute(): Promise<number> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', since);
  return count || 0;
}

export async function fetchDueQueueEntries(limit: number): Promise<EmailQueueRecord[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('next_attempt_at', nowIso)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    logError('fetchDueQueueEntries', error);
    return [];
  }

  return (data || []) as EmailQueueRecord[];
}

export async function lockQueueEntry(id: string, workerId: string): Promise<EmailQueueRecord | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .update({
      status: 'processing',
      locked_at: nowIso,
      locked_by: workerId,
    })
    .eq('id', id)
    .in('status', ['pending', 'failed'])
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EmailQueueRecord;
}

export async function markQueueEntrySent(params: {
  id: string;
  attempts: number;
  providerMessageId?: string | null;
}): Promise<void> {
  await supabaseAdmin
    .from('email_dispatch_queue')
    .update({
      status: 'sent',
      attempts: params.attempts,
      provider_message_id: params.providerMessageId || null,
      sent_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq('id', params.id);
}

export async function markQueueEntryFailed(params: {
  id: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string;
}): Promise<{ status: 'failed' | 'dead'; nextAttemptAt: string | null }> {
  const nextStatus: 'failed' | 'dead' = params.attempts >= params.maxAttempts ? 'dead' : 'failed';
  const delayMinutes =
    params.attempts >= 1 && params.attempts <= EMAIL_RETRY_DELAYS_MINUTES.length
      ? EMAIL_RETRY_DELAYS_MINUTES[params.attempts - 1]
      : EMAIL_RETRY_DELAYS_MINUTES[EMAIL_RETRY_DELAYS_MINUTES.length - 1];

  const nextAttemptAt =
    nextStatus === 'dead' ? null : new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('email_dispatch_queue')
    .update({
      status: nextStatus,
      attempts: params.attempts,
      next_attempt_at: nextAttemptAt || new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: params.errorMessage.slice(0, 2000),
    })
    .eq('id', params.id);

  return { status: nextStatus, nextAttemptAt };
}

export async function retryQueueEntry(queueId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .update({
      status: 'pending',
      next_attempt_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq('id', queueId)
    .in('status', ['failed', 'dead', 'cancelled']);

  return !error;
}

export async function cancelQueueEntry(queueId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .update({
      status: 'cancelled',
      locked_at: null,
      locked_by: null,
      next_attempt_at: new Date().toISOString(),
      last_error: 'Cancelled by admin',
    })
    .eq('id', queueId)
    .in('status', ['pending', 'failed', 'processing']);

  return !error;
}
