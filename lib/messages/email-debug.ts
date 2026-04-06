import { logError } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import { normalizeSupportSubject } from '@/lib/messages/threading';

export interface MessageEmailDebugEvent {
  id: string;
  message_id: string | null;
  email_thread_id: string | null;
  customer_email: string | null;
  direction: 'inbound' | 'outbound';
  event_type: string;
  match_status: 'matched' | 'unmatched' | 'error' | null;
  match_strategy: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  email_subject: string | null;
  normalized_subject: string | null;
  provider_message_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface RecordMessageEmailDebugEventInput {
  messageId?: string | null;
  emailThreadId?: string | null;
  customerEmail?: string | null;
  direction: 'inbound' | 'outbound';
  eventType: string;
  matchStatus?: 'matched' | 'unmatched' | 'error' | null;
  matchStrategy?: string | null;
  senderEmail?: string | null;
  recipientEmail?: string | null;
  emailSubject?: string | null;
  normalizedSubject?: string | null;
  providerMessageId?: string | null;
  details?: Record<string, unknown> | null;
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

function isMissingMessageEmailDebugSchemaError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code || '').toLowerCase();
  const message = normalizeErrorMessage(error).toLowerCase();

  return (
    code === '42p01' ||
    code === '42703' ||
    code === 'pgrst200' ||
    code === 'pgrst201' ||
    code === 'pgrst204' ||
    code === 'pgrst205' ||
    message.includes('message_email_debug_events') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

export async function recordMessageEmailDebugEvent(input: RecordMessageEmailDebugEventInput) {
  try {
    await supabaseAdmin.from('message_email_debug_events').insert({
      message_id: input.messageId || null,
      email_thread_id: input.emailThreadId || null,
      customer_email: String(input.customerEmail || '').trim().toLowerCase() || null,
      direction: input.direction,
      event_type: input.eventType,
      match_status: input.matchStatus || null,
      match_strategy: input.matchStrategy || null,
      sender_email: String(input.senderEmail || '').trim().toLowerCase() || null,
      recipient_email: String(input.recipientEmail || '').trim().toLowerCase() || null,
      email_subject: String(input.emailSubject || '').trim() || null,
      normalized_subject:
        String(input.normalizedSubject || '').trim() ||
        normalizeSupportSubject(input.emailSubject || ''),
      provider_message_id: String(input.providerMessageId || '').trim() || null,
      details: input.details || {},
    });
  } catch (error) {
    if (isMissingMessageEmailDebugSchemaError(error)) {
      return;
    }

    logError('message-email-debug-record', {
      error: normalizeErrorMessage(error),
      eventType: input.eventType,
      direction: input.direction,
      messageId: input.messageId || null,
      emailThreadId: input.emailThreadId || null,
    });
  }
}

export async function listMessageEmailDebugEvents(input: {
  messageId?: string | null;
  emailThreadId?: string | null;
  customerEmail?: string | null;
  subject?: string | null;
}) {
  try {
    const events = new Map<string, MessageEmailDebugEvent>();
    const normalizedCustomerEmail = String(input.customerEmail || '').trim().toLowerCase();
    const normalizedSubject = normalizeSupportSubject(input.subject || '');

    const addEvents = (rows: MessageEmailDebugEvent[] | null | undefined) => {
      for (const row of rows || []) {
        events.set(row.id, row);
      }
    };

    if (input.messageId) {
      const { data, error } = await supabaseAdmin
        .from('message_email_debug_events')
        .select('*')
        .eq('message_id', input.messageId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error && !isMissingMessageEmailDebugSchemaError(error)) {
        throw error;
      }

      addEvents((data as MessageEmailDebugEvent[] | null | undefined) || []);
    }

    if (input.emailThreadId) {
      const { data, error } = await supabaseAdmin
        .from('message_email_debug_events')
        .select('*')
        .eq('email_thread_id', input.emailThreadId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error && !isMissingMessageEmailDebugSchemaError(error)) {
        throw error;
      }

      addEvents((data as MessageEmailDebugEvent[] | null | undefined) || []);
    }

    if (normalizedCustomerEmail && normalizedSubject) {
      const { data, error } = await supabaseAdmin
        .from('message_email_debug_events')
        .select('*')
        .eq('customer_email', normalizedCustomerEmail)
        .eq('normalized_subject', normalizedSubject)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error && !isMissingMessageEmailDebugSchemaError(error)) {
        throw error;
      }

      addEvents((data as MessageEmailDebugEvent[] | null | undefined) || []);
    }

    return Array.from(events.values()).sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    );
  } catch (error) {
    if (isMissingMessageEmailDebugSchemaError(error)) {
      return [] as MessageEmailDebugEvent[];
    }

    logError('message-email-debug-list', {
      error: normalizeErrorMessage(error),
      messageId: input.messageId || null,
      emailThreadId: input.emailThreadId || null,
      customerEmail: input.customerEmail || null,
    });
    return [] as MessageEmailDebugEvent[];
  }
}
