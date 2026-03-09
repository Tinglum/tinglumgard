import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { resolveCampaignRecipients, upsertCampaignRecipients } from '@/lib/email/campaigns';
import type { EmailClassification } from '@/lib/email/types';

const ALLOWED_CLASSIFICATIONS: EmailClassification[] = [
  'transactional',
  'support',
  'promotional',
  'system',
];

const ALLOWED_STATUSES = new Set([
  'draft',
  'ready',
  'queued',
  'sending',
  'completed',
  'cancelled',
]);

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { data, error } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }

  return NextResponse.json({ campaigns: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const name = String(body?.name || '').trim();
  const classification = String(body?.classification || 'promotional').trim() as EmailClassification;
  const subjectNo = String(body?.subjectNo || '').trim();
  const subjectEn = String(body?.subjectEn || '').trim();
  const bodyNo = String(body?.bodyNo || '').trim();
  const bodyEn = String(body?.bodyEn || '').trim();
  const recipientMode = String(body?.recipientMode || 'all').trim() as 'all' | 'manual' | 'filters';
  const recipientFilter = typeof body?.recipientFilter === 'object' && body?.recipientFilter ? body.recipientFilter : {};
  const manualRecipients = Array.isArray(body?.manualRecipients) ? body.manualRecipients : [];
  const requestedStatus = String(body?.status || 'draft').trim();
  const mappedStatus =
    requestedStatus === 'ready_for_approval' || requestedStatus === 'approved'
      ? 'ready'
      : requestedStatus;
  const status = ALLOWED_STATUSES.has(mappedStatus) ? mappedStatus : 'draft';

  if (!name || !subjectNo || !subjectEn || !bodyNo || !bodyEn) {
    return NextResponse.json({ error: 'Missing campaign fields' }, { status: 400 });
  }

  if (!ALLOWED_CLASSIFICATIONS.includes(classification)) {
    return NextResponse.json({ error: 'Invalid classification' }, { status: 400 });
  }

  if (!['all', 'manual', 'filters'].includes(recipientMode)) {
    return NextResponse.json({ error: 'Invalid recipient mode' }, { status: 400 });
  }

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('email_campaigns')
    .insert({
      name,
      classification,
      status,
      subject_no: subjectNo,
      subject_en: subjectEn,
      body_no: bodyNo,
      body_en: bodyEn,
      recipient_mode: recipientMode,
      recipient_filter: recipientFilter,
      created_by: admin.session?.email || admin.session?.name || 'admin',
    })
    .select('*')
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }

  const recipients = await resolveCampaignRecipients({
    recipientMode,
    recipientFilter,
    manualRecipients,
  });
  const totalRecipients = await upsertCampaignRecipients(campaign.id, recipients);

  await supabaseAdmin
    .from('email_campaigns')
    .update({ total_recipients: totalRecipients })
    .eq('id', campaign.id);

  return NextResponse.json({
    campaign: {
      ...campaign,
      total_recipients: totalRecipients,
    },
    totalRecipients,
  });
}
