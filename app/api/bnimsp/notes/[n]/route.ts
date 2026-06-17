import { NextRequest, NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { getBnimspRole, canViewBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Private per-director note for one slide. Only real directors persist to the DB;
// admin/operations previewing the page keep notes client-side (localStorage).
function directorId(session: Awaited<ReturnType<typeof getBnimspSession>>): string | null {
  if (getBnimspRole(session) !== 'director') return null
  return session?.userId || null
}

export async function GET(request: NextRequest, { params }: { params: { n: string } }) {
  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = directorId(session)
  if (!id) return NextResponse.json({ body: '' }) // non-director: no server-side note
  const n = Number(params.n)
  try {
    const { data } = await supabaseAdmin
      .from('bnimsp_user_notes')
      .select('body, updated_at')
      .eq('director_id', id)
      .eq('slide_n', n)
      .maybeSingle()
    return NextResponse.json({ body: data?.body || '', updatedAt: data?.updated_at || null })
  } catch {
    return NextResponse.json({ body: '' })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { n: string } }) {
  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = directorId(session)
  if (!id) return NextResponse.json({ ok: true, persisted: false }) // preview users: client-only
  const n = Number(params.n)
  if (!Number.isInteger(n)) return NextResponse.json({ error: 'Invalid slide' }, { status: 400 })
  try {
    const body = await request.json().catch(() => ({}))
    const text = String(body.body || '')
    const { error } = await supabaseAdmin.from('bnimsp_user_notes').upsert({
      director_id: id,
      slide_n: n,
      body: text,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      logError('bnimsp-notes-put', error)
      return NextResponse.json({ error: 'Kunne ikke lagre notat' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, persisted: true })
  } catch (err) {
    logError('bnimsp-notes-put', err)
    return NextResponse.json({ error: 'Kunne ikke lagre notat' }, { status: 500 })
  }
}
