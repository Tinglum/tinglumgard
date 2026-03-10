import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { ensureLifecycleSeedData } from '@/lib/email/lifecycle';
import { getEmailSchemaStatus, isMissingEmailRelationError } from '@/lib/email/schema';

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const schemaStatus = await getEmailSchemaStatus(['email_flows', 'email_templates']);
  if (!schemaStatus.ready) {
    return NextResponse.json(
      {
        error: `Missing email schema tables: ${schemaStatus.missingTables.join(', ')}`,
        missingTables: schemaStatus.missingTables,
        hint: 'Run migration 20260310210000_repair_unified_email_schema.sql',
      },
      { status: 503 }
    );
  }

  // Keep core lifecycle flows/templates self-healed in environments where rows were never seeded.
  try {
    await ensureLifecycleSeedData();
  } catch (error) {
    if (isMissingEmailRelationError(error)) {
      return NextResponse.json(
        {
          error: 'Email schema mismatch while seeding lifecycle flows',
          hint: 'Run migration 20260310210000_repair_unified_email_schema.sql',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to seed lifecycle flows' }, { status: 500 });
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
        error: 'Email schema mismatch while fetching flows',
        hint: 'Run migration 20260310210000_repair_unified_email_schema.sql',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
}
