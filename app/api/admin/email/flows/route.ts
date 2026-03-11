import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { ensureLifecycleSeedData } from '@/lib/email/lifecycle';
import { getEmailSchemaStatus, isMissingEmailRelationError } from '@/lib/email/schema';

const FALLBACK_FLOWS = [
  'pig.remainder.explainer',
  'pig.remainder.reminder',
  'egg.remainder.reminder',
  'egg.delivery.day_before',
  'egg.hatch.followup',
  'egg.order.forfeited',
  'chicken.ready_for_pickup',
  'chicken.pickup.reminder',
  'chicken.remainder.collected',
].map((flowKey) => ({
  id: `fallback:${flowKey}`,
  flow_key: flowKey,
  event_type: 'fallback',
  mode: 'active',
  active: true,
  product_scope: 'shared',
  template_key: null,
  send_offset_minutes: 0,
  email_templates: null,
  fallback: true,
}));

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const schemaStatus = await getEmailSchemaStatus(['email_flows', 'email_templates']);
  if (!schemaStatus.ready) {
    return NextResponse.json(
      {
        flows: FALLBACK_FLOWS,
        warning: `Missing email schema tables: ${schemaStatus.missingTables.join(', ')}`,
        missingTables: schemaStatus.missingTables,
        hint: 'Run migration 20260310210000_repair_unified_email_schema.sql',
        degradedMode: true,
      },
      { status: 200 }
    );
  }

  // Keep core lifecycle flows/templates self-healed in environments where rows were never seeded.
  try {
    await ensureLifecycleSeedData();
  } catch (error) {
    if (isMissingEmailRelationError(error)) {
      return NextResponse.json(
        {
          flows: FALLBACK_FLOWS,
          warning: 'Email schema mismatch while seeding lifecycle flows',
          hint: 'Run migration 20260310210000_repair_unified_email_schema.sql',
          degradedMode: true,
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { flows: FALLBACK_FLOWS, warning: 'Failed to seed lifecycle flows', degradedMode: true },
      { status: 200 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('email_flows')
    .select('*, email_templates(template_key, subject_no, subject_en, classification, active)')
    .order('flow_key', { ascending: true });

  if (!error) {
    return NextResponse.json({ flows: data || [] });
  }

  if (isMissingEmailRelationError(error)) {
    return NextResponse.json(
      {
        flows: FALLBACK_FLOWS,
        warning: 'Email schema mismatch while fetching flows',
        hint: 'Run migration 20260310210000_repair_unified_email_schema.sql',
        degradedMode: true,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { flows: FALLBACK_FLOWS, warning: 'Failed to fetch flows', degradedMode: true },
    { status: 200 }
  );
}
