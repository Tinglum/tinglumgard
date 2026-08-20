import { NextRequest, NextResponse } from 'next/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { supabaseAdmin } from '@/lib/supabase/server'
import { listLiveParticipants } from '@/lib/quest/live-store'
import { logError } from '@/lib/logger'
import {
  FAST_OCCURRENCES,
  FASTING_BOOKING_URL,
  FASTING_REMINDER_OFFSETS,
  FASTING_TRACK_LABEL,
  FASTING_TRACK_PLAN,
  daysBetweenDates,
  fastingReminderCopy,
  londonDateOnly,
  type FastingReminderOffset,
} from '@/lib/quest/fasting-content'

function buildFastingReminderHtml(params: {
  displayName: string
  trackLabel: string
  occurrenceIndex: number
  occurrenceTotal: number
  startLabel: string
  endLabel: string
  planText: string
  lede: string
  bookingUrl: string
}) {
  const fastLabel = params.occurrenceTotal > 1 ? `Fast ${params.occurrenceIndex} of ${params.occurrenceTotal}` : 'Your fast'
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
    .muted { color: #6b7280; font-size: 14px; }
    .window { font-size: 16px; font-weight: 600; margin: 14px 0; }
    .button { display: inline-block; background: #173f2b; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="title">${params.lede}</div>
      <p>Hi ${params.displayName},</p>
      <p class="muted">${params.trackLabel} · ${fastLabel}</p>
      <div class="window">From ${params.startLabel} to ${params.endLabel}</div>
      <p>${params.planText}</p>
      <p>
        <a class="button" href="${params.bookingUrl}">Book a clarification call with Kenneth</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET
    const token = request.headers.get('x-cron-secret')
    if (secret) {
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { timingSafeEqual } = await import('crypto')
      const secretBuf = Buffer.from(secret)
      const tokenBuf = Buffer.from(token)
      const valid = secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf)
      if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = londonDateOnly(new Date())
    const participants = await listLiveParticipants()
    const enrolled = participants.filter(
      (p) => p.fasting_challenge?.opted_in && p.fasting_challenge.status === 'enrolled' && p.fasting_challenge.track
    )

    let remindersSent = 0
    let skippedNoEmail = 0

    for (const participant of enrolled) {
      const track = participant.fasting_challenge!.track!
      const occurrences = FAST_OCCURRENCES.filter((o) => o.track === track)

      for (const occurrence of occurrences) {
        const daysUntil = daysBetweenDates(occurrence.startDate, today)
        if (!FASTING_REMINDER_OFFSETS.includes(daysUntil as FastingReminderOffset)) continue
        const offset = daysUntil as FastingReminderOffset

        let email: string | null = null
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(participant.user_id)
          email = data.user?.email || null
        } catch (lookupError) {
          logError('fasting-reminders-user-lookup', lookupError, { userId: participant.user_id })
        }
        if (!email) { skippedNoEmail += 1; continue }

        const copy = fastingReminderCopy(offset)
        const html = buildFastingReminderHtml({
          displayName: participant.display_name || 'there',
          trackLabel: FASTING_TRACK_LABEL[track],
          occurrenceIndex: occurrence.index,
          occurrenceTotal: occurrence.total,
          startLabel: occurrence.startLabel,
          endLabel: occurrence.endLabel,
          planText: FASTING_TRACK_PLAN[track],
          lede: copy.lede,
          bookingUrl: FASTING_BOOKING_URL,
        })
        const subject = `${copy.subjectLead} — Fasting challenge`

        await dispatchEmail({
          to: email,
          subject,
          html,
          classification: 'transactional',
          locale: 'en',
          sourcePath: 'cron.fasting-reminders',
          templateKey: 'quest.fasting.reminder',
          flowKey: `quest.fasting.reminder.${copy.tag}`,
          sendImmediately: true,
          idempotency: {
            source: 'cron.fasting-reminders',
            entity: 'quest_participant',
            id: `${participant.user_id}:${track}:${occurrence.index}:${copy.tag}`,
            template: 'quest.fasting.reminder',
          },
        })

        remindersSent += 1
      }
    }

    return NextResponse.json({ success: true, remindersSent, skippedNoEmail })
  } catch (error) {
    logError('fasting-reminders-main', error)
    return NextResponse.json({ error: 'Failed to run fasting reminders' }, { status: 500 })
  }
}
