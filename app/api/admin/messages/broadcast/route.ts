import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createAdminInitiatedCustomerThread } from '@/lib/messages/admin-thread';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getEffectiveBoxSize } from '@/lib/orders/display';

type BroadcastFilters = {
  awaitingFinalPayment?: boolean;
  boxSize?: number | null;
  hasExtras?: boolean;
  extraIds?: string[];
};

type CandidateRecipient = {
  email: string;
  phone?: string | null;
  name?: string | null;
};

type RecipientAssessment = CandidateRecipient & {
  reason?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueByEmail(items: CandidateRecipient[]) {
  const map = new Map<string, CandidateRecipient>();
  for (const item of items) {
    const email = normalizeEmail(item.email);
    if (!email) continue;
    if (!map.has(email)) {
      map.set(email, {
        email,
        phone: item.phone || null,
        name: item.name || null,
      });
    }
  }
  return Array.from(map.values());
}

async function getRecipientsFromUsers(excludePhones: string[] = []): Promise<CandidateRecipient[]> {
  const excluded = new Set(excludePhones);
  const { data: users } = await supabaseAdmin
    .from('vipps_users')
    .select('phone_number, name, email')
    .not('email', 'is', null);

  return uniqueByEmail(
    (users || [])
      .filter((row) => !row.phone_number || !excluded.has(row.phone_number))
      .map((row) => ({
        email: String(row.email || ''),
        phone: row.phone_number || null,
        name: row.name || null,
      }))
  );
}

async function getRecipientsFromManualPhones(phones: string[], excludePhones: string[] = []) {
  const excluded = new Set(excludePhones);
  const selectedPhones = phones.filter((phone) => !excluded.has(phone));
  if (selectedPhones.length === 0) return [];

  const { data: users } = await supabaseAdmin
    .from('vipps_users')
    .select('phone_number, name, email')
    .in('phone_number', selectedPhones)
    .not('email', 'is', null);

  return uniqueByEmail(
    (users || []).map((row) => ({
      email: String(row.email || ''),
      phone: row.phone_number || null,
      name: row.name || null,
    }))
  );
}

async function getRecipientsFromOrders(filters: BroadcastFilters, excludePhones: string[] = []) {
  const excluded = new Set(excludePhones);

  const extraIds = Array.isArray(filters.extraIds) ? filters.extraIds : [];
  const hasExtras = filters.hasExtras === true;
  const boxSize = typeof filters.boxSize === 'number' ? filters.boxSize : null;
  const awaitingFinalPayment = filters.awaitingFinalPayment === true;

  let matchingExtraSlugs = new Set<string>();
  if (extraIds.length > 0) {
    const { data: extras } = await supabaseAdmin.from('extras_catalog').select('id, slug').in('id', extraIds);
    matchingExtraSlugs = new Set((extras || []).map((row) => String(row.slug || '')).filter(Boolean));
  }

  let query = supabaseAdmin.from('orders').select(
    'id, customer_phone, customer_name, customer_email, box_size, status, extra_products, mangalitsa_preset:mangalitsa_box_presets(target_weight_kg)'
  );
  if (awaitingFinalPayment) {
    query = query.eq('status', 'deposit_paid');
  }

  const { data: orders } = await query;
  const recipients: CandidateRecipient[] = [];

  for (const order of orders || []) {
    if (order.customer_phone && excluded.has(order.customer_phone)) continue;
    const email = normalizeEmail(String(order.customer_email || ''));
    if (!email || email === 'pending@vipps.no') continue;
    if (boxSize && getEffectiveBoxSize(order as any) !== boxSize) continue;

    const extras = Array.isArray(order.extra_products) ? order.extra_products : [];
    if (hasExtras && extras.length === 0) continue;

    if (matchingExtraSlugs.size > 0) {
      const hasMatchingExtra = extras.some((item: any) => matchingExtraSlugs.has(String(item?.slug || '')));
      if (!hasMatchingExtra) continue;
    }

    recipients.push({
      email,
      phone: order.customer_phone || null,
      name: order.customer_name || null,
    });
  }

  return uniqueByEmail(recipients);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      subject,
      message,
      mode,
      recipients,
      excludedPhones,
      filters,
      dryRun,
      overridePhones,
    } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const exclude = Array.isArray(excludedPhones) ? excludedPhones.map(String) : [];
    const override = new Set(Array.isArray(overridePhones) ? overridePhones.map(String) : []);
    const recipientMode: 'all' | 'manual' | 'filters' = ['manual', 'filters'].includes(mode) ? mode : 'all';
    const parsedFilters: BroadcastFilters = filters || {};

    let resolved: CandidateRecipient[] = [];
    if (recipientMode === 'manual') {
      resolved = await getRecipientsFromManualPhones(
        Array.isArray(recipients) ? recipients.map(String) : [],
        exclude
      );
    } else if (recipientMode === 'filters') {
      resolved = await getRecipientsFromOrders(parsedFilters, exclude);
    } else {
      resolved = await getRecipientsFromUsers(exclude);
    }

    if (resolved.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    const emails = resolved.map((recipient) => normalizeEmail(recipient.email)).filter(Boolean);
    const phones = resolved.map((recipient) => String(recipient.phone || '').trim()).filter(Boolean);

    const [suppressionResult, preferenceResult] = await Promise.all([
      emails.length > 0
        ? supabaseAdmin
            .from('email_suppression_list')
            .select('email, reason')
            .in('email', emails)
        : Promise.resolve({ data: [], error: null }),
      phones.length > 0
        ? supabaseAdmin
            .from('notification_preferences')
            .select('customer_phone, email_enabled, promotional_enabled')
            .in('customer_phone', phones)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (suppressionResult.error) {
      return NextResponse.json({ error: 'Failed to inspect suppression list' }, { status: 500 });
    }
    if (preferenceResult.error) {
      return NextResponse.json({ error: 'Failed to inspect notification preferences' }, { status: 500 });
    }

    const suppressionByEmail = new Map(
      (suppressionResult.data || []).map((row) => [normalizeEmail(String(row.email || '')), String(row.reason || '')])
    );
    const preferencesByPhone = new Map(
      (preferenceResult.data || []).map((row) => [String(row.customer_phone || '').trim(), row])
    );

    const allowedRecipients: CandidateRecipient[] = [];
    const optedOutRecipients: RecipientAssessment[] = [];
    const blockedRecipients: RecipientAssessment[] = [];

    for (const recipient of resolved) {
      const email = normalizeEmail(recipient.email);
      const phone = String(recipient.phone || '').trim();

      if (!email) {
        blockedRecipients.push({ ...recipient, reason: 'missing_email' });
        continue;
      }

      if (!phone) {
        blockedRecipients.push({ ...recipient, reason: 'missing_phone' });
        continue;
      }

      const suppressionReason = suppressionByEmail.get(email);
      if (suppressionReason === 'bounced' || suppressionReason === 'complaint') {
        blockedRecipients.push({ ...recipient, reason: suppressionReason });
        continue;
      }

      const preference = preferencesByPhone.get(phone);
      const isOptedOut =
        suppressionReason === 'manual_unsubscribe' ||
        preference?.email_enabled === false ||
        preference?.promotional_enabled === false;

      if (isOptedOut && !override.has(phone)) {
        optedOutRecipients.push({
          ...recipient,
          reason:
            suppressionReason === 'manual_unsubscribe'
              ? 'manual_unsubscribe'
              : preference?.email_enabled === false
                ? 'email_disabled'
                : 'promotional_disabled',
        });
        continue;
      }

      allowedRecipients.push(recipient);
    }

    if (dryRun === true) {
      return NextResponse.json({
        totalResolved: resolved.length,
        sendableCount: allowedRecipients.length,
        optedOutCount: optedOutRecipients.length,
        blockedCount: blockedRecipients.length,
        sendableRecipients: allowedRecipients,
        optedOutRecipients,
        blockedRecipients,
      });
    }

    if (allowedRecipients.length === 0 && optedOutRecipients.length > 0) {
      return NextResponse.json(
        {
          error: 'Some recipients are opted out and require review',
          needsReview: true,
          optedOutRecipients,
          blockedRecipients,
          totalResolved: resolved.length,
          sendableCount: 0,
        },
        { status: 409 }
      );
    }

    const adminName = String(session.name || session.email || 'Tinglum Gard');
    const results = await Promise.allSettled(
      allowedRecipients.map((recipient) =>
        createAdminInitiatedCustomerThread({
          customerName: recipient.name || null,
          customerEmail: recipient.email,
          customerPhone: String(recipient.phone || ''),
          subject: String(subject),
          message: String(message),
          adminName,
          sourcePath: '/api/admin/messages/broadcast',
          metadata: {
            recipient_mode: recipientMode,
            recipient_filter: parsedFilters,
            opted_out_override: override.has(String(recipient.phone || '').trim()),
          },
        })
      )
    );

    const sent = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results
      .map((result, index) => ({ result, recipient: allowedRecipients[index] }))
      .filter((entry) => entry.result.status === 'rejected')
      .map((entry) => ({
        ...entry.recipient,
        reason: entry.result.status === 'rejected' && entry.result.reason instanceof Error
          ? entry.result.reason.message
          : 'send_failed',
      }));

    return NextResponse.json({
      totalResolved: resolved.length,
      sentCount: sent,
      failedCount: failed.length,
      optedOutCount: optedOutRecipients.length,
      blockedCount: blockedRecipients.length,
      optedOutRecipients,
      blockedRecipients,
      failedRecipients: failed,
    });
  } catch (error) {
    console.error('admin messages broadcast compatibility route failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
