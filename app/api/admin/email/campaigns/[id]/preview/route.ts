import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import {
  evaluateCampaignRecipients,
  resolveCampaignRecipients,
  upsertCampaignRecipients,
  type CampaignRecipient,
} from '@/lib/email/campaigns';
import { isMissingEmailRelationError } from '@/lib/email/schema';

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

  if (isMissingEmailRelationError(campaignError)) {
    return NextResponse.json(
      { error: 'Campaign tables are not migrated yet in this environment' },
      { status: 503 }
    );
  }

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const recipientsResult = await supabaseAdmin
    .from('email_campaign_recipients')
    .select('email, phone, name')
    .eq('campaign_id', campaign.id);
  if (isMissingEmailRelationError(recipientsResult.error)) {
    return NextResponse.json(
      { error: 'Campaign recipient tables are not migrated yet in this environment' },
      { status: 503 }
    );
  }
  let recipientRows = recipientsResult.data || [];

  if (!recipientRows || recipientRows.length === 0) {
    const resolved = await resolveCampaignRecipients({
      recipientMode: campaign.recipient_mode,
      recipientFilter: (campaign.recipient_filter || {}) as Record<string, unknown>,
    });
    const inserted = await upsertCampaignRecipients(campaign.id, resolved);
    if (resolved.length > 0 && inserted === 0) {
      return NextResponse.json(
        { error: 'Campaign recipient tables are not migrated yet in this environment' },
        { status: 503 }
      );
    }
    const refreshed = await supabaseAdmin
      .from('email_campaign_recipients')
      .select('email, phone, name')
      .eq('campaign_id', campaign.id);
    if (isMissingEmailRelationError(refreshed.error)) {
      return NextResponse.json(
        { error: 'Campaign recipient tables are not migrated yet in this environment' },
        { status: 503 }
      );
    }
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
