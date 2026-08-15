import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendViaMailgun } from '@/lib/email/provider-mailgun'

const recentRequests = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const previous = recentRequests.get(ip) || 0
    if (Date.now() - previous < 10_000) return Response.json({ error: 'Please wait a moment before trying again.' }, { status: 429 })
    recentRequests.set(ip, Date.now())

    const body = await request.json()
    const name = String(body.name || '').trim().slice(0, 80)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (name.length < 2 || !email.includes('@') || password.length < 8) {
      return Response.json({ error: 'Enter your name, a valid email, and a password of at least 8 characters.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup', email, password,
      options: { data: { display_name: name, full_name: name } },
    })
    if (error || !data.properties?.hashed_token) {
      if (error?.message?.toLowerCase().includes('already')) {
        return Response.json({ error: 'An account already exists for this email. Choose Log in instead.' }, { status: 409 })
      }
      throw error || new Error('Could not create confirmation link')
    }

    const confirmUrl = new URL('https://tinglumgard.no/quest')
    confirmUrl.searchParams.set('token_hash', data.properties.hashed_token)
    confirmUrl.searchParams.set('type', 'signup')
    const sent = await sendViaMailgun({
      to: email,
      subject: 'Confirm your Fitpreneur Nutrition Fitness account',
      text: `Hi ${name},\n\nConfirm your email address to activate your Nutrition Fitness account:\n${confirmUrl.toString()}\n\nIf you did not request this account, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17251d"><p style="letter-spacing:.18em;font-size:12px;font-weight:700">FITPRENEUR</p><h1>Confirm your email</h1><p>Hi ${escapeHtml(name)},</p><p>Click below to activate your Nutrition Fitness account.</p><p style="margin:28px 0"><a href="${confirmUrl.toString()}" style="background:#173f2b;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;display:inline-block;font-weight:600">Confirm your email</a></p><p style="color:#666;font-size:13px">If you did not request this account, you can ignore this email.</p></div>`,
    })
    if (!sent.success) throw new Error(sent.error || 'Confirmation email could not be sent')
    return Response.json({ success: true })
  } catch (error) {
    console.error('quest-register', error)
    return Response.json({ error: 'Registration could not be completed. Please try again.' }, { status: 500 })
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[character] || character))
}
