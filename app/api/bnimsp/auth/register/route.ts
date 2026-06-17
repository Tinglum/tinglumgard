import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { hashPassword } from '@/lib/bnimsp/password'
import { isBnimspAdminEmail } from '@/lib/bnimsp/admins'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Self-service director signup. Creates a new director and logs them in.
// Insert-only: an existing email is rejected (never overwritten) so no one can
// take over another director's account through this endpoint.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim()
    const password = String(body.password || '')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Oppgi en gyldig e-postadresse' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Passordet må være minst 8 tegn' }, { status: 400 })
    }

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from('bnimsp_directors')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (lookupErr) {
      logError('bnimsp-register-lookup', lookupErr)
      return NextResponse.json({ error: 'Kunne ikke opprette konto akkurat nå' }, { status: 500 })
    }
    if (existing) {
      return NextResponse.json(
        { error: 'Det finnes allerede en konto med denne e-posten. Logg inn i stedet.' },
        { status: 409 },
      )
    }

    const password_hash = await hashPassword(password)
    const { data: created, error: insertErr } = await supabaseAdmin
      .from('bnimsp_directors')
      .insert({ email, name, password_hash, active: true })
      .select('id, email, name')
      .single()
    if (insertErr || !created) {
      logError('bnimsp-register-insert', insertErr)
      return NextResponse.json({ error: 'Kunne ikke opprette konto' }, { status: 500 })
    }

    const token = await createSession({
      userId: created.id,
      vippsSub: `bnimsp:${created.id}`,
      email: created.email,
      name: created.name || created.email,
      role: 'director',
      bnimspAdmin: isBnimspAdminEmail(created.email),
    })
    await setSessionCookie(token)
    return NextResponse.json({ ok: true, name: created.name || created.email })
  } catch (err) {
    logError('bnimsp-register', err)
    return NextResponse.json({ error: 'Registrering feilet' }, { status: 500 })
  }
}
