import { NextRequest, NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { getBnimspRole, canViewBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sanitizeScriptHtml } from '@/lib/bnimsp/sanitize'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Per-director, per-slide personalisation: private notes + an optional rewritten
// script (with highlights baked in as <mark>). Stored DDL-free as a JSON blob in
// bnimsp_user_notes.body. Only real directors persist to the DB.
interface PersonalState {
  notes: string
  script: string | null
}

function directorId(session: Awaited<ReturnType<typeof getBnimspSession>>): string | null {
  if (getBnimspRole(session) !== 'director') return null
  return session?.userId || null
}

function parseBody(raw: string | null | undefined): PersonalState {
  if (!raw) return { notes: '', script: null }
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object' && ('notes' in obj || 'script' in obj)) {
      return { notes: typeof obj.notes === 'string' ? obj.notes : '', script: typeof obj.script === 'string' ? obj.script : null }
    }
  } catch { /* legacy plain-text note */ }
  return { notes: String(raw), script: null }
}

export async function GET(request: NextRequest, { params }: { params: { n: string } }) {
  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = directorId(session)
  if (!id) return NextResponse.json({ notes: '', script: null }) // non-director: client-side only
  const n = Number(params.n)
  try {
    const { data } = await supabaseAdmin
      .from('bnimsp_user_notes')
      .select('body, updated_at')
      .eq('director_id', id)
      .eq('slide_n', n)
      .maybeSingle()
    const state = parseBody(data?.body)
    return NextResponse.json({ ...state, updatedAt: data?.updated_at || null })
  } catch {
    return NextResponse.json({ notes: '', script: null })
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
    const incoming = await request.json().catch(() => ({}))

    // Cap field sizes: prevent runaway blobs.
    const NOTES_MAX = 20000
    const SCRIPT_MAX = 30000
    if (typeof incoming.notes === 'string' && incoming.notes.length > NOTES_MAX) {
      return NextResponse.json({ error: `Notes exceeds ${NOTES_MAX} characters` }, { status: 400 })
    }
    if (typeof incoming.script === 'string' && incoming.script.length > SCRIPT_MAX) {
      return NextResponse.json({ error: `Script exceeds ${SCRIPT_MAX} characters` }, { status: 400 })
    }

    // Merge with existing so we can patch notes and script independently.
    const { data: existing } = await supabaseAdmin
      .from('bnimsp_user_notes')
      .select('body')
      .eq('director_id', id)
      .eq('slide_n', n)
      .maybeSingle()
    const state = parseBody(existing?.body)

    if (typeof incoming.notes === 'string') state.notes = incoming.notes
    if ('script' in incoming) {
      // null/empty clears the override (restore original); a string is sanitized & stored.
      state.script = incoming.script ? sanitizeScriptHtml(String(incoming.script)) : null
    }

    const { error } = await supabaseAdmin.from('bnimsp_user_notes').upsert({
      director_id: id,
      slide_n: n,
      body: JSON.stringify(state),
      updated_at: new Date().toISOString(),
    })
    if (error) {
      logError('bnimsp-notes-put', error)
      return NextResponse.json({ error: 'Kunne ikke lagre' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, persisted: true })
  } catch (err) {
    logError('bnimsp-notes-put', err)
    return NextResponse.json({ error: 'Kunne ikke lagre' }, { status: 500 })
  }
}
