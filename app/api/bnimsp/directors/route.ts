import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/bnimsp/password'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Admin: list directors.
export async function GET() {
  const session = await getSession()
  if (!canEditBnimsp(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  try {
    const { data, error } = await supabaseAdmin
      .from('bnimsp_directors')
      .select('id, email, name, active, created_at, last_login_at')
      .order('created_at')
    if (error) return NextResponse.json({ error: 'Tabellene finnes ikke ennå. Kjør migrasjonen.' }, { status: 500 })
    return NextResponse.json({ directors: data || [] })
  } catch (err) {
    logError('bnimsp-directors-get', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// Admin: create or update a director (sets/resets password when provided).
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!canEditBnimsp(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim()
    const password = String(body.password || '')
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'E-post og passord (min. 8 tegn) kreves' }, { status: 400 })
    }
    const password_hash = await hashPassword(password)
    const { error } = await supabaseAdmin
      .from('bnimsp_directors')
      .upsert({ email, name, password_hash, active: true }, { onConflict: 'email' })
    if (error) {
      logError('bnimsp-directors-post', error)
      return NextResponse.json({ error: 'Kunne ikke lagre. Er migrasjonen kjørt?' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    logError('bnimsp-directors-post', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
