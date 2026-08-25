import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/bnimsp/password'
import { hashPasswordResetToken } from '@/lib/bnimsp/password-reset'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = String(body.token || '').trim()
    const password = String(body.password || '')
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json({ error: 'Lenken er ugyldig eller utløpt.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Passordet må være minst 8 tegn.' }, { status: 400 })
    }

    const tokenHash = hashPasswordResetToken(token)
    const tokenKey = `bnimsp_password_reset_token:${tokenHash}`
    const { data: tokenRow, error } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', tokenKey)
      .maybeSingle()
    if (error) throw error
    let tokenData: { directorId?: string; expiresAt?: string } = {}
    try {
      tokenData = typeof tokenRow?.value === 'string' ? JSON.parse(tokenRow.value) : tokenRow?.value || {}
    } catch {}
    if (!tokenData.directorId || !tokenData.expiresAt || new Date(tokenData.expiresAt).getTime() <= Date.now()) {
      if (tokenRow) await supabaseAdmin.from('app_config').delete().eq('key', tokenKey)
      return NextResponse.json({ error: 'Lenken er ugyldig eller utløpt.' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    // Claim the token before changing the password so concurrent requests cannot reuse it.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('app_config')
      .delete()
      .eq('key', tokenKey)
      .select('key')
      .maybeSingle()
    if (claimError) throw claimError
    if (!claimed) {
      return NextResponse.json({ error: 'Lenken er allerede brukt.' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('bnimsp_directors')
      .update({ password_hash: passwordHash })
      .eq('id', tokenData.directorId)
      .eq('active', true)
      .select('id')
      .maybeSingle()
    if (updateError) throw updateError
    if (!updated) {
      return NextResponse.json({ error: 'Kontoen er ikke tilgjengelig.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logError('bnimsp-reset-password', err)
    return NextResponse.json({ error: 'Kunne ikke endre passordet. Prøv igjen.' }, { status: 500 })
  }
}
