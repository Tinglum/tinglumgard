import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { isMissingEmailRelationError } from '@/lib/email/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const subjectNo = String(body?.subjectNo || '').trim();
  const subjectEn = String(body?.subjectEn || '').trim();
  const bodyNo = String(body?.bodyNo || '').trim();
  const bodyEn = String(body?.bodyEn || '').trim();
  const changeNote = typeof body?.changeNote === 'string' ? body.changeNote : null;

  if (!subjectNo || !subjectEn || !bodyNo || !bodyEn) {
    return NextResponse.json({ error: 'Missing version content' }, { status: 400 });
  }

  const { data: template, error: templateError } = await supabaseAdmin
    .from('email_templates')
    .select('id, current_version')
    .eq('id', params.id)
    .single();

  if (templateError || !template) {
    if (isMissingEmailRelationError(templateError)) {
      return NextResponse.json(
        { error: 'Template tables are not migrated yet in this environment' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const nextVersion = Number(template.current_version || 0) + 1;
  const changedBy = admin.session?.email || admin.session?.name || 'admin';

  const { data: version, error: versionError } = await supabaseAdmin
    .from('email_template_versions')
    .insert({
      template_id: params.id,
      version: nextVersion,
      subject_no: subjectNo,
      subject_en: subjectEn,
      body_no: bodyNo,
      body_en: bodyEn,
      change_note: changeNote,
      changed_by: changedBy,
    })
    .select('*')
    .single();

  if (versionError || !version) {
    if (isMissingEmailRelationError(versionError)) {
      return NextResponse.json(
        { error: 'Template version table is not migrated yet in this environment' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to create template version' }, { status: 500 });
  }

  const { data: updatedTemplate } = await supabaseAdmin
    .from('email_templates')
    .update({
      subject_no: subjectNo,
      subject_en: subjectEn,
      body_no: bodyNo,
      body_en: bodyEn,
      current_version: nextVersion,
    })
    .eq('id', params.id)
    .select('*')
    .single();

  return NextResponse.json({
    template: updatedTemplate || null,
    version,
  });
}
