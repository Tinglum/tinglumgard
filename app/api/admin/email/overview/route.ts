import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { getEmailDispatchSettings } from '@/lib/email/queue';
import { getEmailSchemaStatus, isMissingEmailRelationError } from '@/lib/email/schema';

type CountResult = {
  count: number;
  available: boolean;
};

async function safeCount(
  queryFactory: () => PromiseLike<{ count: number | null; error: unknown }>
): Promise<CountResult> {
  const result = await queryFactory();
  if (!result.error) {
    return { count: result.count || 0, available: true };
  }

  if (isMissingEmailRelationError(result.error)) {
    return { count: 0, available: false };
  }

  throw result.error;
}

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const schemaStatus = await getEmailSchemaStatus();
  const [queueCount, sentToday, failedCount, campaignsCount, templatesCount, flowsCount, suppressionCount, flowInstanceScheduled, missingAlertCount] =
    await Promise.all([
      safeCount(() =>
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'processing', 'failed'])
      ),
      safeCount(() =>
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ),
      safeCount(() =>
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .in('status', ['failed', 'dead'])
      ),
      safeCount(() => supabaseAdmin.from('email_campaigns').select('id', { count: 'exact', head: true })),
      safeCount(() => supabaseAdmin.from('email_templates').select('id', { count: 'exact', head: true })),
      safeCount(() => supabaseAdmin.from('email_flows').select('id', { count: 'exact', head: true })),
      safeCount(() =>
        supabaseAdmin.from('email_suppression_list').select('id', { count: 'exact', head: true })
      ),
      safeCount(() =>
        supabaseAdmin
          .from('email_flow_instances')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'scheduled')
      ),
      safeCount(() =>
        supabaseAdmin
          .from('email_dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'cancelled')
          .contains('metadata', { missing_email_alert: true })
      ),
    ]);

  const settings = await getEmailDispatchSettings();

  return NextResponse.json({
    queue: {
      active: queueCount.count || 0,
      failed: failedCount.count || 0,
      sentLast24h: sentToday.count || 0,
    },
    entities: {
      campaigns: campaignsCount.count || 0,
      templates: templatesCount.count || 0,
      flows: flowsCount.count || 0,
      suppressions: suppressionCount.count || 0,
      flowInstancesScheduled: flowInstanceScheduled.count || 0,
      missingEmailAlerts: missingAlertCount.count || 0,
    },
    dispatch: settings,
    schemaStatus,
    degradedMode:
      !queueCount.available ||
      !sentToday.available ||
      !failedCount.available ||
      !campaignsCount.available ||
      !templatesCount.available ||
      !flowsCount.available ||
      !suppressionCount.available ||
      !flowInstanceScheduled.available ||
      !missingAlertCount.available ||
      !schemaStatus.ready,
  });
}
