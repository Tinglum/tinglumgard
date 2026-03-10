import { supabaseAdmin } from '@/lib/supabase/server';

export const REQUIRED_EMAIL_SCHEMA_TABLES = [
  'email_templates',
  'email_template_versions',
  'email_flows',
  'email_dispatch_queue',
  'email_campaigns',
  'email_campaign_recipients',
  'email_suppression_list',
  'email_delivery_events',
  'email_flow_instances',
  'email_flow_runs',
] as const;

function normalizeErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error);
}

export function isMissingEmailRelationError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code || '').toLowerCase();
  const message = normalizeErrorMessage(error).toLowerCase();

  return (
    code === '42p01' ||
    code === 'pgrst205' ||
    message.includes("could not find the table 'public.email_") ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

export async function getEmailSchemaStatus(
  tables: readonly string[] = REQUIRED_EMAIL_SCHEMA_TABLES
): Promise<{
  ready: boolean;
  checkedTables: string[];
  missingTables: string[];
  details: Record<string, string>;
}> {
  const checkedTables = Array.from(new Set(tables));
  const missingTables: string[] = [];
  const details: Record<string, string> = {};

  for (const table of checkedTables) {
    const { error } = await supabaseAdmin.from(table).select('id', { count: 'exact', head: true });

    if (!error) continue;
    if (isMissingEmailRelationError(error)) {
      missingTables.push(table);
      details[table] = normalizeErrorMessage(error);
      continue;
    }

    throw error;
  }

  return {
    ready: missingTables.length === 0,
    checkedTables,
    missingTables,
    details,
  };
}
