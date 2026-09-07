import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAdminAccess } from '@/app/api/admin/email/_shared'

export async function GET() {
  const auth = await requireAdminAccess()
  if (!auth.ok) return auth.response
  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const key = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const db = createClient(url, key, { db: { schema: 'todotwo' }, auth: { persistSession: false } })
  const { data, error } = await db.from('audit_log').select('id, occurred_at, actor_person_id, after').eq('entity_table', 'fence_readings').order('occurred_at', { ascending: false }).limit(365)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const personIds = Array.from(new Set((data ?? []).flatMap((row) => row.actor_person_id ? [row.actor_person_id as string] : [])))
  const { data: people } = personIds.length ? await db.from('people_roster').select('id, full_name, preferred_name').in('id', personIds) : { data: [] }
  const names = new Map((people ?? []).map((person) => [person.id as string, (person.preferred_name || person.full_name) as string]))
  return NextResponse.json({ readings: (data ?? []).map((row) => ({ id: row.id, recordedAt: row.occurred_at, person: names.get(row.actor_person_id as string) ?? 'Unknown', ...(row.after as object) })) })
}
