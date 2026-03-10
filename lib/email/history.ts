import { supabaseAdmin } from '@/lib/supabase/server';
import { isMissingEmailRelationError } from '@/lib/email/schema';

export type CommunicationHistoryEntry = {
  id: string;
  source: 'email_dispatch_queue' | 'legacy_email_log';
  channel: 'email';
  classification: string;
  status: string;
  subject: string;
  templateKey: string | null;
  toEmail: string | null;
  sentAt: string | null;
  createdAt: string | null;
  sourcePath: string | null;
  providerMessageId: string | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  orderRefs: {
    orderId: string | null;
    eggOrderId: string | null;
    chickenOrderId: string | null;
    campaignId: string | null;
    customerMessageId: string | null;
  };
};

export type ResolvedOrderIds = {
  pigOrderIds: string[];
  eggOrderIds: string[];
  chickenOrderIds: string[];
};

function normalizeEmail(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function phoneDigits(value?: string | null): string {
  return String(value || '').replace(/\D/g, '');
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return Array.from(set);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

async function queryOrderIdsByIdentity(params: {
  table: 'orders' | 'egg_orders' | 'chicken_orders';
  userId?: string;
  email?: string;
  phoneTail?: string;
  limitPerQuery: number;
}): Promise<string[]> {
  const idSet = new Set<string>();
  const queries = [];

  if (params.userId) {
    queries.push(
      supabaseAdmin
        .from(params.table)
        .select('id')
        .eq('user_id', params.userId)
        .limit(params.limitPerQuery)
    );
  }
  if (params.email) {
    queries.push(
      supabaseAdmin
        .from(params.table)
        .select('id')
        .ilike('customer_email', params.email)
        .limit(params.limitPerQuery)
    );
  }
  if (params.phoneTail) {
    queries.push(
      supabaseAdmin
        .from(params.table)
        .select('id')
        .ilike('customer_phone', `%${params.phoneTail}`)
        .limit(params.limitPerQuery)
    );
  }

  if (queries.length === 0) return [];

  const results = await Promise.all(queries);
  for (const result of results) {
    if (result.error) {
      if (isMissingEmailRelationError(result.error)) continue;
      throw result.error;
    }
    for (const row of result.data || []) {
      if (row?.id) idSet.add(String(row.id));
    }
  }

  return Array.from(idSet);
}

export async function resolveOrderIdsForIdentity(params: {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  limitPerQuery?: number;
}): Promise<ResolvedOrderIds> {
  const normalizedEmail = normalizeEmail(params.email);
  const normalizedPhone = phoneDigits(params.phone);
  const phoneTail =
    normalizedPhone.length >= 8 ? normalizedPhone.slice(-8) : normalizedPhone.length >= 4 ? normalizedPhone : '';
  const userId =
    params.userId && !String(params.userId).startsWith('impersonated:') ? String(params.userId) : '';
  const limitPerQuery = Math.max(20, Math.min(500, Math.round(params.limitPerQuery || 200)));

  const [pigOrderIds, eggOrderIds, chickenOrderIds] = await Promise.all([
    queryOrderIdsByIdentity({
      table: 'orders',
      userId,
      email: normalizedEmail || undefined,
      phoneTail: phoneTail || undefined,
      limitPerQuery,
    }),
    queryOrderIdsByIdentity({
      table: 'egg_orders',
      userId,
      email: normalizedEmail || undefined,
      phoneTail: phoneTail || undefined,
      limitPerQuery,
    }),
    queryOrderIdsByIdentity({
      table: 'chicken_orders',
      userId,
      email: normalizedEmail || undefined,
      phoneTail: phoneTail || undefined,
      limitPerQuery,
    }),
  ]);

  return {
    pigOrderIds,
    eggOrderIds,
    chickenOrderIds,
  };
}

function toQueueHistoryEntry(row: Record<string, unknown>): CommunicationHistoryEntry {
  return {
    id: String(row.id),
    source: 'email_dispatch_queue',
    channel: 'email',
    classification: String(row.classification || 'system'),
    status: String(row.status || 'unknown'),
    subject: String(row.subject || ''),
    templateKey: row.template_key ? String(row.template_key) : null,
    toEmail: row.to_email ? String(row.to_email) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    sourcePath: row.source_path ? String(row.source_path) : null,
    providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    metadata: asRecord(row.metadata),
    orderRefs: {
      orderId: row.order_id ? String(row.order_id) : null,
      eggOrderId: row.egg_order_id ? String(row.egg_order_id) : null,
      chickenOrderId: row.chicken_order_id ? String(row.chicken_order_id) : null,
      campaignId: row.campaign_id ? String(row.campaign_id) : null,
      customerMessageId: row.customer_message_id ? String(row.customer_message_id) : null,
    },
  };
}

function toLegacyHistoryEntry(row: Record<string, unknown>): CommunicationHistoryEntry {
  return {
    id: String(row.id),
    source: 'legacy_email_log',
    channel: 'email',
    classification: 'system',
    status: 'sent',
    subject: String(row.subject || ''),
    templateKey: null,
    toEmail: row.recipient ? String(row.recipient) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    sourcePath: 'legacy.email_log',
    providerMessageId: null,
    lastError: null,
    metadata: {},
    orderRefs: {
      orderId: row.order_id ? String(row.order_id) : null,
      eggOrderId: null,
      chickenOrderId: null,
      campaignId: null,
      customerMessageId: null,
    },
  };
}

export async function fetchCommunicationHistory(params: {
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
  pigOrderIds?: string[];
  eggOrderIds?: string[];
  chickenOrderIds?: string[];
  limit?: number;
}): Promise<CommunicationHistoryEntry[]> {
  const normalizedEmail = normalizeEmail(params.email);
  const normalizedPhone = phoneDigits(params.phone);
  const phoneTail =
    normalizedPhone.length >= 8 ? normalizedPhone.slice(-8) : normalizedPhone.length >= 4 ? normalizedPhone : '';
  const limit = Math.max(20, Math.min(500, Math.round(params.limit || 200)));

  const resolvedOrders =
    params.pigOrderIds || params.eggOrderIds || params.chickenOrderIds
      ? {
          pigOrderIds: uniqueStrings(params.pigOrderIds || []),
          eggOrderIds: uniqueStrings(params.eggOrderIds || []),
          chickenOrderIds: uniqueStrings(params.chickenOrderIds || []),
        }
      : await resolveOrderIdsForIdentity({
          userId: params.userId,
          email: normalizedEmail || undefined,
          phone: normalizedPhone || undefined,
          limitPerQuery: limit,
        });

  const queueQueries = [];
  if (normalizedEmail) {
    queueQueries.push(
      supabaseAdmin
        .from('email_dispatch_queue')
        .select('*')
        .ilike('to_email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  }
  if (phoneTail) {
    queueQueries.push(
      supabaseAdmin
        .from('email_dispatch_queue')
        .select('*')
        .ilike('to_phone', `%${phoneTail}`)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  }
  if (resolvedOrders.pigOrderIds.length > 0) {
    queueQueries.push(
      supabaseAdmin
        .from('email_dispatch_queue')
        .select('*')
        .in('order_id', resolvedOrders.pigOrderIds)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  }
  if (resolvedOrders.eggOrderIds.length > 0) {
    queueQueries.push(
      supabaseAdmin
        .from('email_dispatch_queue')
        .select('*')
        .in('egg_order_id', resolvedOrders.eggOrderIds)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  }
  if (resolvedOrders.chickenOrderIds.length > 0) {
    queueQueries.push(
      supabaseAdmin
        .from('email_dispatch_queue')
        .select('*')
        .in('chicken_order_id', resolvedOrders.chickenOrderIds)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  }

  const historyMap = new Map<string, CommunicationHistoryEntry>();

  if (queueQueries.length > 0) {
    const queueResults = await Promise.all(queueQueries);
    for (const result of queueResults) {
      if (result.error) {
        if (isMissingEmailRelationError(result.error)) continue;
        throw result.error;
      }
      for (const row of result.data || []) {
        const mapped = toQueueHistoryEntry(row as Record<string, unknown>);
        historyMap.set(`${mapped.source}:${mapped.id}`, mapped);
      }
    }
  }

  const legacyQueries = [];
  if (normalizedEmail) {
    legacyQueries.push(
      supabaseAdmin
        .from('email_log')
        .select('id, recipient, subject, sent_at, created_at, order_id')
        .ilike('recipient', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  }
  if (resolvedOrders.pigOrderIds.length > 0) {
    legacyQueries.push(
      supabaseAdmin
        .from('email_log')
        .select('id, recipient, subject, sent_at, created_at, order_id')
        .in('order_id', resolvedOrders.pigOrderIds)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  }

  if (legacyQueries.length > 0) {
    const legacyResults = await Promise.all(legacyQueries);
    for (const result of legacyResults) {
      if (result.error) {
        if (isMissingEmailRelationError(result.error)) continue;
        throw result.error;
      }
      for (const row of result.data || []) {
        const mapped = toLegacyHistoryEntry(row as Record<string, unknown>);
        historyMap.set(`${mapped.source}:${mapped.id}`, mapped);
      }
    }
  }

  return Array.from(historyMap.values())
    .sort((a, b) => {
      const aTs = new Date(a.sentAt || a.createdAt || 0).getTime();
      const bTs = new Date(b.sentAt || b.createdAt || 0).getTime();
      return bTs - aTs;
    })
    .slice(0, limit);
}
