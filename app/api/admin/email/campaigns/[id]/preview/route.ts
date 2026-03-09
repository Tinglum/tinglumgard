import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import {
  evaluateCampaignRecipients,
  resolveCampaignRecipients,
  upsertCampaignRecipients,
  type CampaignRecipient,
} from '@/lib/email/campaigns';

function toRecipient(row: any): CampaignRecipient {
  return {
    email: String(row.email || '').trim().toLowerCase(),
    phone: row.phone || null,
    name: row.name || null,
  };
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .eq('id', params.id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  let { data: recipientRows } = await supabaseAdmin
    .from('email_campaign_recipients')
    .select('email, phone, name')
    .eq('campaign_id', campaign.id);

  if (!recipientRows || recipientRows.length === 0) {
    const resolved = await resolveCampaignRecipients({
      recipientMode: campaign.recipient_mode,
      recipientFilter: (campaign.recipient_filter || {}) as Record<string, unknown>,
    });
    await upsertCampaignRecipients(campaign.id, resolved);
    const refreshed = await supabaseAdmin
      .from('email_campaign_recipients')
      .select('email, phone, name')
      .eq('campaign_id', campaign.id);
    recipientRows = refreshed.data || [];
  }

  const recipients = (recipientRows || []).map(toRecipient);
  const eligibility = await evaluateCampaignRecipients(recipients);

  return NextResponse.json({
    campaignId: campaign.id,
    total: recipients.length,
    sendable: eligibility.allowed.length,
    skipped: eligibility.skipped.length,
    skippedReasons: eligibility.skipped.reduce((acc, row) => {
      acc[row.reason] = (acc[row.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    sample: {
      allowed: eligibility.allowed.slice(0, 10),
      skipped: eligibility.skipped.slice(0, 10),
    },
  });
}
