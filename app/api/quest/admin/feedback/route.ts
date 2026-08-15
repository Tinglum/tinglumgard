import { NextRequest } from 'next/server'
import { sendViaMailgun } from '@/lib/email/provider-mailgun'
import { getLiveEvent, listLiveParticipants, saveLiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError, questError, requireQuestAdmin } from '@/lib/quest/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const admin = await requireQuestAdmin()
    const body = await request.json()
    const participantId = String(body.participantId || '')
    const message = String(body.message || '').trim().slice(0, 5000)
    const shouldSend = body.sendEmail === true
    if (!participantId || !message) throw new QuestApiError('Participant and feedback are required')

    const event = await getLiveEvent()
    if (!event) throw new QuestApiError('No active questionnaire session', 404)
    const participant = (await listLiveParticipants()).find((row) => row.id === participantId && row.event_id === event.id)
    if (!participant) throw new QuestApiError('Participant not found in this session', 404)

    const now = new Date().toISOString()
    participant.feedback = {
      message,
      updated_at: now,
      sent_by: admin.email || admin.name || 'admin',
    }
    await saveLiveParticipant(participant)

    let sentAt: string | undefined
    if (shouldSend) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(participant.user_id)
      if (error || !data.user?.email) throw new QuestApiError('This participant has no deliverable email address')
      const result = await sendViaMailgun({
        to: data.user.email,
        subject: 'Your Nutrition Fitness assessment feedback',
        text: `Hi ${participant.display_name},\n\n${message}\n\nYou can also view this feedback when you sign in to your assessment.`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px"><h2>Your Nutrition Fitness feedback</h2><p>Hi ${escapeHtml(participant.display_name)},</p><div style="white-space:pre-wrap">${escapeHtml(message)}</div><p style="margin-top:24px">You can also view this feedback when you sign in to your assessment.</p></div>`,
      })
      if (!result.success) throw new Error(result.error || 'Feedback email could not be sent')
      sentAt = now
      participant.feedback.sent_at = sentAt
      await saveLiveParticipant(participant)
    }
    return Response.json({ feedback: participant.feedback, emailSent: Boolean(sentAt) })
  } catch (error) {
    return questError(error)
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character] || character))
}
