import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireTodoTwoApiUser } from '@/lib/todotwo/auth'

/**
 * A narrow shared-list write path. Any signed-in farm member may add an item,
 * but the server chooses the project and every other task field.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTodoTwoApiUser()
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as { title?: unknown } | null
  const title = typeof body?.title === 'string' ? body.title.trim().replace(/\s+/g, ' ') : ''
  if (!title || title.length > 120) {
    return NextResponse.json({ error: 'Enter an item between 1 and 120 characters.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const key = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Grocery list is not configured.' }, { status: 500 })

  const db = createClient(url, key, {
    db: { schema: 'todotwo' },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: project, error: projectError } = await db
    .from('projects')
    .select('id')
    .eq('slug', 'grocery-list')
    .is('deleted_at', null)
    .maybeSingle()
  if (projectError || !project) {
    return NextResponse.json({ error: 'Grocery List project was not found.' }, { status: 500 })
  }

  const { data, error } = await db
    .from('tasks')
    .insert({
      title,
      project_id: project.id,
      status: 'unassigned',
      created_by_person_id: auth.principal.person.id,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, taskId: data.id })
}
