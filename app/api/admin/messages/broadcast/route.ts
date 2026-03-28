import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
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
    const { subject, message, mode, recipients, excludedPhones, filters } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const exclude = Array.isArray(excludedPhones) ? excludedPhones.map(String) : [];
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

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        name: `Legacy broadcast ${new Date().toISOString()}`,
        classification: 'promotional',
        status: 'ready',
        subject_no: String(subject),
        subject_en: String(subject),
        body_no: String(message),
        body_en: String(message),
        recipient_mode: recipientMode,
        recipient_filter: parsedFilters,
        total_recipients: resolved.length,
        created_by: session.email || session.name || 'admin',
      })
      .select('id')
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    const rows = resolved.map((recipient) => ({
      campaign_id: campaign.id,
      email: recipient.email,
      phone: recipient.phone || null,
      name: recipient.name || null,
      status: 'planned',
    }));

    await supabaseAdmin.from('email_campaign_recipients').upsert(rows, {
      onConflict: 'campaign_id,email',
    });

    return NextResponse.json({
      count: rows.length,
      campaignId: campaign.id,
      requiresApproval: false,
      queuedByCron: true,
    });
  } catch (error) {
    console.error('admin messages broadcast compatibility route failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
