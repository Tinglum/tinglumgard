import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { data, error } = await supabaseAdmin
    .from('email_flows')
    .select('*, email_templates(template_key, subject_no, subject_en, classification, active)')
    .order('flow_key', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
  }

  return NextResponse.json({ flows: data || [] });
}
