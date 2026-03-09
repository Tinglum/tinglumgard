import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return false;

  const expected = crypto.createHmac('sha256', signingKey).update(`${timestamp}${token}`).digest('hex');
  return expected === signature;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function asObject(value: unknown): Record<string, any> {
  if (value && typeof value === 'object') return value as Record<string, any>;
  return {};
}

async function findQueueIdByProviderMessageId(providerMessageId: string | null): Promise<string | null> {
  if (!providerMessageId) return null;

  const variants = Array.from(
    new Set([
      providerMessageId,
      providerMessageId.replace(/[<>]/g, ''),
      `<${providerMessageId.replace(/[<>]/g, '')}>`,
    ])
  ).filter(Boolean);

  for (const variant of variants) {
    const { data } = await supabaseAdmin
      .from('email_dispatch_queue')
      .select('id')
      .eq('provider_message_id', variant)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }

  return null;
}

export async function POST(request: NextRequest) {
  let eventData: Record<string, any> | null = null;
  let timestamp = '';
  let token = '';
  let signature = '';

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const json = await request.json();
    if (json?.['event-data']) {
      eventData = asObject(json['event-data']);
    } else {
      eventData = asObject(json);
    }
    timestamp = String(eventData?.timestamp || '');
    token = String(eventData?.token || '');
    signature = String(eventData?.signature || '');
  } else {
    const form = await request.formData();
    timestamp = String(form.get('timestamp') || '');
    token = String(form.get('token') || '');
    signature = String(form.get('signature') || '');
    const rawEventData = form.get('event-data');
    if (typeof rawEventData === 'string') {
      try {
        eventData = JSON.parse(rawEventData);
      } catch {
        eventData = null;
      }
    }
  }

  if (!eventData) {
    return NextResponse.json({ error: 'Missing event payload' }, { status: 400 });
  }

  if (!verifyMailgunSignature(timestamp, token, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const eventType = String(eventData.event || 'unknown');
  const recipient = normalizeEmail(String(eventData.recipient || ''));
  const providerEventId = String(eventData.id || `${eventType}:${recipient}:${Date.now()}`);

  const message = asObject(eventData.message);
  const headers = asObject(message.headers);
  const providerMessageId =
    String(headers['message-id'] || headers['Message-Id'] || eventData['message-id'] || '').trim() || null;

  const queueId = await findQueueIdByProviderMessageId(providerMessageId);

  await supabaseAdmin.from('email_delivery_events').upsert(
    {
      queue_id: queueId,
      provider_event_id: providerEventId,
      event_type: eventType,
      recipient: recipient || 'unknown',
      payload: eventData,
      event_at: eventData.timestamp ? new Date(Number(eventData.timestamp) * 1000).toISOString() : null,
    },
    { onConflict: 'provider_event_id' }
  );

  const lowerType = eventType.toLowerCase();

  if (queueId) {
    if (lowerType === 'delivered' || lowerType === 'accepted') {
      await supabaseAdmin
        .from('email_dispatch_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', queueId);
    } else if (
      lowerType === 'failed' ||
      lowerType === 'rejected' ||
      lowerType === 'complained' ||
      lowerType === 'complaint' ||
      lowerType === 'bounced'
    ) {
      await supabaseAdmin
        .from('email_dispatch_queue')
        .update({
          status: 'failed',
          last_error: `Provider event: ${eventType}`,
        })
        .eq('id', queueId);
    }
  }

  const isComplaint = lowerType === 'complained' || lowerType === 'complaint';
  const isBounce = lowerType === 'bounced' || lowerType === 'failed';
  const severity = String(eventData?.severity || '').toLowerCase();
  const isHardBounce = isBounce && (severity === 'permanent' || severity === 'hard' || !severity);

  if (recipient && (isComplaint || isHardBounce)) {
    await supabaseAdmin.from('email_suppression_list').upsert(
      {
        email: recipient,
        reason: isComplaint ? 'complaint' : 'bounced',
        source: 'mailgun.webhook',
      },
      { onConflict: 'email' }
    );
  }

  return NextResponse.json({ success: true });
}
