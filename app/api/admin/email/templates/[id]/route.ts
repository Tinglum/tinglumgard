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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('email_templates')
    .select('id, template_key, classification, subject_no, subject_en, body_no, body_en, variables')
    .eq('id', params.id)
    .maybeSingle();

  if (existingError) {
    if (isMissingEmailRelationError(existingError)) {
      return NextResponse.json(
        { error: 'Template tables are not migrated yet in this environment' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to read template' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (typeof body?.templateKey === 'string' && body.templateKey.trim()) {
    updates.template_key = body.templateKey.trim();
  }
  if (typeof body?.classification === 'string' && body.classification.trim()) {
    const classification = body.classification.trim() as EmailClassification;
    if (!ALLOWED_CLASSIFICATIONS.includes(classification)) {
      return NextResponse.json({ error: 'Invalid classification' }, { status: 400 });
    }
    updates.classification = classification;
  }
  if (typeof body?.productScope === 'string' && body.productScope.trim()) {
    updates.product_scope = body.productScope.trim();
  }
  if (typeof body?.subjectNo === 'string') updates.subject_no = body.subjectNo;
  if (typeof body?.subjectEn === 'string') updates.subject_en = body.subjectEn;
  if (typeof body?.bodyNo === 'string') updates.body_no = body.bodyNo;
  if (typeof body?.bodyEn === 'string') updates.body_en = body.bodyEn;
  if (Array.isArray(body?.variables)) updates.variables = body.variables;
  if (typeof body?.active === 'boolean') updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const merged = {
    templateKey:
      typeof updates.template_key === 'string' ? String(updates.template_key) : String(existing.template_key || ''),
    classification:
      typeof updates.classification === 'string'
        ? String(updates.classification)
        : String(existing.classification || ''),
    subjectNo:
      typeof updates.subject_no === 'string' ? String(updates.subject_no) : String(existing.subject_no || ''),
    subjectEn:
      typeof updates.subject_en === 'string' ? String(updates.subject_en) : String(existing.subject_en || ''),
    bodyNo: typeof updates.body_no === 'string' ? String(updates.body_no) : String(existing.body_no || ''),
    bodyEn: typeof updates.body_en === 'string' ? String(updates.body_en) : String(existing.body_en || ''),
    variables:
      Array.isArray(updates.variables) ? updates.variables : Array.isArray(existing.variables) ? existing.variables : [],
  };

  const lint = lintManagedTemplate(merged);
  if (!lint.ok) {
    return NextResponse.json({ error: 'Template validation failed', details: lint.errors }, { status: 400 });
  }
  updates.variables = lint.normalizedVariables;

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error || !data) {
    if (isMissingEmailRelationError(error)) {
      return NextResponse.json(
        { error: 'Template tables are not migrated yet in this environment' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}
