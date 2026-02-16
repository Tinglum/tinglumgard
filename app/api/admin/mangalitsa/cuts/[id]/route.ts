import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = new Set([
  'name_no',
  'name_en',
  'chef_name_no',
  'chef_name_en',
  'part_id',
  'description_no',
  'description_en',
  'size_from_kg',
  'size_to_kg',
  'display_order',
  'active',
]);

function normalizeInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload || {})) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      if (key === 'display_order') {
        updates.display_order = normalizeInt(value, 0);
        continue;
      }
      if (key === 'size_from_kg' || key === 'size_to_kg') {
        updates[key] = normalizeNullableNumber(value);
        continue;
      }
      updates[key] = value;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('cuts_catalog')
      .update(updates)
      .eq('id', params.id)
      .select('id,slug,name_no,name_en,chef_name_no,chef_name_en,description_no,description_en,size_from_kg,size_to_kg,display_order,active,part_id,updated_at')
      .single();

    if (error) {
      logError('admin-mangalitsa-cut-update', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cut: data });
  } catch (error) {
    logError('admin-mangalitsa-cut-update', error);
    return NextResponse.json({ error: 'Failed to update cut' }, { status: 500 });
  }
}
