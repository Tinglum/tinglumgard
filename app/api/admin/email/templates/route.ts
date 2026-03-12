import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import type { EmailClassification } from '@/lib/email/types';
import { isMissingEmailRelationError } from '@/lib/email/schema';
import { lintManagedTemplate } from '@/lib/email/template-lint';

const ALLOWED_CLASSIFICATIONS: EmailClassification[] = [
  'transactional',
  'support',
  'promotional',
  'system',
];

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .order('template_key', { ascending: true });

  if (error) {
    if (isMissingEmailRelationError(error)) {
      return NextResponse.json({
        error: 'email_templates table is not available in this environment yet',
      }, { status: 503 });
    }

    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }

  return NextResponse.json({ templates: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const templateKey = String(body?.templateKey || '').trim();
  const classification = String(body?.classification || '').trim() as EmailClassification;
  const productScope = String(body?.productScope || 'shared').trim();
  const subjectNo = String(body?.subjectNo || '').trim();
  const subjectEn = String(body?.subjectEn || '').trim();
  const bodyNo = String(body?.bodyNo || '').trim();
  const bodyEn = String(body?.bodyEn || '').trim();
  const variables = Array.isArray(body?.variables) ? body.variables : [];

  if (!templateKey) {
    return NextResponse.json({ error: 'Missing required template fields' }, { status: 400 });
  }

  if (!ALLOWED_CLASSIFICATIONS.includes(classification)) {
    return NextResponse.json({ error: 'Invalid classification' }, { status: 400 });
  }

  const lint = lintManagedTemplate({
    subjectNo,
    subjectEn,
    bodyNo,
    bodyEn,
    variables,
    classification,
    templateKey,
  });
  if (!lint.ok) {
    return NextResponse.json({ error: 'Template validation failed', details: lint.errors }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('email_templates')
    .insert({
      template_key: templateKey,
      classification,
      product_scope: productScope,
      subject_no: subjectNo,
      subject_en: subjectEn,
      body_no: bodyNo,
      body_en: bodyEn,
      variables: lint.normalizedVariables,
      active: true,
      current_version: 1,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    if (isMissingEmailRelationError(insertError)) {
      return NextResponse.json(
        { error: 'Template tables are not migrated yet in this environment' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }

  await supabaseAdmin.from('email_template_versions').insert({
    template_id: inserted.id,
    version: 1,
    subject_no: subjectNo,
    subject_en: subjectEn,
    body_no: bodyNo,
    body_en: bodyEn,
    change_note: 'Initial version',
    changed_by: admin.session?.email || admin.session?.name || 'admin',
  });

  return NextResponse.json({ template: inserted });
}
