import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/bnimsp/password'
import { isBnimspAdminEmail } from '@/lib/bnimsp/admins'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Director login. Verifies email + password against bnimsp_directors and issues
// the standard app session cookie with role 'director'.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!email || !password) {
      return NextResponse.json({ error: 'E-post og passord kreves' }, { status: 400 })
    }

    const { data: director, error } = await supabaseAdmin
      .from('bnimsp_directors')
      .select('id, email, name, password_hash, active')
      .eq('email', email)
      .maybeSingle()

    // Uniform error to avoid leaking which emails exist.
    if (error || !director || !director.active) {
      return NextResponse.json({ error: 'Feil e-post eller passord' }, { status: 401 })
    }
    const ok = await verifyPassword(password, director.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Feil e-post eller passord' }, { status: 401 })
    }

    const token = await createSession({
      userId: director.id,
      vippsSub: `bnimsp:${director.id}`,
      email: director.email,
      name: director.name || director.email,
      role: 'director',
      bnimspAdmin: isBnimspAdminEmail(director.email),
    })
    await setSessionCookie(token)
    await supabaseAdmin
      .from('bnimsp_directors')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', director.id)

    return NextResponse.json({ ok: true, name: director.name || director.email })
  } catch (err) {
    logError('bnimsp-login', err)
    return NextResponse.json({ error: 'Innlogging feilet' }, { status: 500 })
  }
}
