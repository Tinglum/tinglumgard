import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendViaMailgun } from '@/lib/email/provider-mailgun'
import {
  createPasswordResetToken,
  PASSWORD_RESET_THROTTLE_MS,
  PASSWORD_RESET_TTL_MS,
} from '@/lib/bnimsp/password-reset'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const GENERIC_MESSAGE = 'Hvis e-postadressen finnes, sender vi en lenke for å velge nytt passord.'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] || character))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Skriv inn en gyldig e-postadresse.' }, { status: 400 })
    }

    const { data: director, error } = await supabaseAdmin
      .from('bnimsp_directors')
      .select('id, email, name, active')
      .eq('email', email)
      .maybeSingle()

    if (error) throw error
    if (!director?.active) return NextResponse.json({ ok: true, message: GENERIC_MESSAGE })

    const requestKey = `bnimsp_password_reset_request:${director.id}`
    const { data: previousRequest, error: requestLookupError } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', requestKey)
      .maybeSingle()
    if (requestLookupError) throw requestLookupError
    const lastRequested = Number(previousRequest?.value || 0)
    if (Date.now() - lastRequested < PASSWORD_RESET_THROTTLE_MS) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE })
    }

    const { token, hash } = createPasswordResetToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS)
    const tokenKey = `bnimsp_password_reset_token:${hash}`
    const { error: tokenError } = await supabaseAdmin.from('app_config').upsert({
      key: tokenKey,
      value: JSON.stringify({ directorId: director.id, expiresAt: expiresAt.toISOString() }),
    }, { onConflict: 'key' })
    if (tokenError) throw tokenError
    const { error: throttleError } = await supabaseAdmin.from('app_config').upsert({
      key: requestKey,
      value: String(now.getTime()),
    }, { onConflict: 'key' })
    if (throttleError) throw throttleError

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || request.nextUrl.origin).replace(/\/$/, '')
    const resetUrl = `${appUrl}/bnimsp/reset-password?token=${encodeURIComponent(token)}`
    const displayName = escapeHtml(String(director.name || ''))
    const greeting = displayName ? `Hei ${displayName},` : 'Hei,'
    const sent = await sendViaMailgun({
      to: director.email,
      subject: 'Velg nytt passord - BNI MSP',
      text: `Hei,\n\nBruk denne lenken for å velge et nytt passord til BNI MSP:\n${resetUrl}\n\nLenken er gyldig i 30 minutter og kan bare brukes én gang. Hvis du ikke ba om dette, kan du se bort fra e-posten.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18181b"><h2 style="color:#cf2030">BNI MSP</h2><p>${greeting}</p><p>Vi har mottatt en forespørsel om å velge et nytt passord.</p><p style="margin:28px 0"><a href="${escapeHtml(resetUrl)}" style="background:#cf2030;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Velg nytt passord</a></p><p>Lenken er gyldig i 30 minutter og kan bare brukes én gang.</p><p style="color:#71717a;font-size:13px">Hvis du ikke ba om dette, kan du se bort fra e-posten.</p></div>`,
    })
    if (!sent.success) {
      await supabaseAdmin.from('app_config').delete().eq('key', tokenKey)
      throw new Error(sent.error || 'Password reset email failed')
    }

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE })
  } catch (err) {
    logError('bnimsp-forgot-password', err)
    return NextResponse.json({ error: 'Kunne ikke sende e-post akkurat nå. Prøv igjen senere.' }, { status: 500 })
  }
}
