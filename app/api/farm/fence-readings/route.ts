import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireTodoTwoApiUser } from '@/lib/todotwo/auth'

export async function POST(request: NextRequest) {
  const auth = await requireTodoTwoApiUser()
  if (!auth.ok) return auth.response
  const body = await request.json().catch(() => null) as { taskId?: string; goatVolts?: number; pigVolts?: number } | null
  const goatVolts = Number(body?.goatVolts)
  const pigVolts = Number(body?.pigVolts)
  if (!body?.taskId || !Number.isFinite(goatVolts) || !Number.isFinite(pigVolts) || goatVolts < 0 || pigVolts < 0 || goatVolts > 20 || pigVolts > 20) {
    return NextResponse.json({ error: 'Enter both fence readings between 0 and 20 kV.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const key = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Fence logging is not configured.' }, { status: 500 })
  const db = createClient(url, key, { db: { schema: 'todotwo' }, auth: { persistSession: false } })
  const { data: task } = await db.from('tasks_resolved').select('id, title, due_date, series_id').eq('id', body.taskId).maybeSingle()
  if (!task || !/goats \(morning\)/i.test(task.title as string)) return NextResponse.json({ error: 'This is not a morning goat task.' }, { status: 400 })

  // Idempotent per task. The tick box on the list and the step on the detail
  // page can both reach this, and two readings for one morning would quietly
  // corrupt the history rather than fail loudly.
  const { data: already } = await db
    .from('audit_log')
    .select('id')
    .eq('entity_table', 'fence_readings')
    .eq('entity_id', body.taskId)
    .limit(1)
    .maybeSingle()
  if (already) return NextResponse.json({ ok: true, duplicate: true })

  const { error } = await db.from('audit_log').insert({
    actor_person_id: auth.principal.person.id,
    actor_auth_user_id: auth.principal.authUserId,
    entity_schema: 'todotwo',
    entity_table: 'fence_readings',
    entity_id: body.taskId,
    action: 'insert',
    after: { task_id: body.taskId, date: task.due_date, goat_fence_kv: goatVolts, pig_fence_kv: pigVolts },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
