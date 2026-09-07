import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireTodoTwoApiUser } from '@/lib/todotwo/auth'
import { farmToday } from '@/lib/todotwo/time'

const bodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(4000).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

/** Any active member may add unassigned work to the shared Tinglum Farm list. */
export async function POST(request: NextRequest) {
  const auth = await requireTodoTwoApiUser()
  if (!auth.ok) return auth.response

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', message: 'Enter a valid task.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const key = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'create_failed', message: 'Farm tasks are not configured.' }, { status: 500 })
  }

  const db = createClient(url, key, {
    db: { schema: 'todotwo' },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: project, error: projectError } = await db
    .from('projects')
    .select('id')
    .eq('slug', 'tinglum-farm-tasks')
    .is('deleted_at', null)
    .maybeSingle()
  if (projectError || !project) {
    return NextResponse.json({ error: 'create_failed', message: 'Tinglum Farm TASKS was not found.' }, { status: 500 })
  }

  const { data, error } = await db
    .from('tasks')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      project_id: project.id,
      due_date: parsed.data.dueDate ?? farmToday(),
      status: 'unassigned',
      created_by_person_id: auth.principal.person.id,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, taskId: data.id })
}
