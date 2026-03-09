import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { enqueueCampaignById } from '@/lib/email/campaigns';
import { supabaseAdmin } from '@/lib/supabase/server';

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token');
  return token === secret;
}

async function campaignCronOnlyEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'campaign_send_via_api_cron_only')
    .maybeSingle();

  if (typeof data?.value === 'boolean') return data.value;
  if (typeof data?.value === 'string') return data.value === 'true';
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}));
  const locale: 'no' | 'en' = body?.locale === 'en' ? 'en' : 'no';

  const cronOnly = await campaignCronOnlyEnabled();
  const cronAuthorized = isCronAuthorized(request);

  if (!cronAuthorized) {
    const admin = await requireAdminAccess();
    if (!admin.ok) return admin.response;
  }

  if (cronOnly && !cronAuthorized) {
    return NextResponse.json(
      { error: 'Campaign sending is restricted to API/cron execution in current policy' },
      { status: 403 }
    );
  }

  const result = await enqueueCampaignById({
    campaignId: params.id,
    locale,
    sourcePath: '/api/admin/email/campaigns/[id]/enqueue',
  });

  return NextResponse.json(result.payload, { status: result.statusCode });
}
