import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim().slice(0, 80)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (name.length < 2 || !email.includes('@') || password.length < 8) {
      return Response.json({ error: 'Enter your name, a valid email, and a password of at least 8 characters.' }, { status: 400 })
    }

    // Accounts are created already confirmed and the confirmation email is
    // gone. Requiring one put a mail provider between a participant and a
    // session running in the room, and Microsoft addresses in particular were
    // dropping it silently, so people could not get in at all. The address is
    // still stored and still used for results and reminders — it just no
    // longer stands between someone and the questionnaire.
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, full_name: name },
    })
    if (error) {
      const message = String(error.message || '').toLowerCase()
      if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
        return Response.json({ error: 'An account already exists for this email. Choose Log in instead.' }, { status: 409 })
      }
      throw error
    }
    return Response.json({ success: true })
  } catch (error) {
    console.error('quest-register', error)
    return Response.json({ error: 'Registration could not be completed. Please try again.' }, { status: 500 })
  }
}
