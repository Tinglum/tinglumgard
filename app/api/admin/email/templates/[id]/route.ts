import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import type { EmailClassification } from '@/lib/email/types';

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

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}
