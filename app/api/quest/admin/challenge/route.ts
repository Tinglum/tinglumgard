// app/api/quest/admin/challenge/route.ts — admin view of, and manual edits to,
// the fasting-challenge enrolments, plus visibility of the reminder emails the
// hourly cron has actually logged.

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  getEventById,
  getLiveEvent,
  getLiveParticipant,
  listLiveParticipants,
  saveLiveParticipant,
  type FastingChallengeEnrollment,
  type FastingChallengeTrack,
} from '@/lib/quest/live-store'
import { listReminderLog, type ReminderLogEntry } from '@/lib/quest/reminder-log'
import {
  FAST_OCCURRENCES,
  daysBetweenDates,
  londonDateOnly,
} from '@/lib/quest/fasting-content'
import { QuestApiError, questError, requireQuestAdmin } from '@/lib/quest/server'

const TRACKS: FastingChallengeTrack[] = ['standard', 'advanced', 'very_advanced']
const isTrack = (value: unknown): value is FastingChallengeTrack =>
  typeof value === 'string' && (TRACKS as string[]).includes(value)

/** Acknowledgments are medical-safety confirmations the participant made in
 *  person. An admin editing a track must never manufacture them, so an absent
 *  set becomes three explicit falses rather than a silent "yes". */
const NO_ACKNOWLEDGMENTS: FastingChallengeEnrollment['acknowledgments'] = {
  understands_not_medical_advice: false,
  agrees_to_stop_if_unwell: false,
  confirms_prior_experience: false,
}

async function resolveEventId(requested?: string | null) {
  if (requested) {
    const event = await getEventById(requested)
    return event?.id ?? requested
  }
  const active = await getLiveEvent()
  return active?.id ?? null
}

async function emailFor(userId: string) {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
    return data.user?.email || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireQuestAdmin()
    const eventId = await resolveEventId(request.nextUrl.searchParams.get('eventId'))

    const participants = eventId ? await listLiveParticipants(eventId) : []
    const joined = participants.filter((p) => p.fasting_challenge)

    const enrollments = await Promise.all(
      joined.map(async (p) => {
        const challenge = p.fasting_challenge!
        return {
          user_id: p.user_id,
          display_name: p.display_name,
          email: await emailFor(p.user_id),
          track: challenge.track ?? null,
          status: challenge.status,
          opted_in_at: challenge.opted_in_at ?? null,
          acknowledgments: challenge.acknowledgments ?? NO_ACKNOWLEDGMENTS,
        }
      })
    )

    const byTrack = { standard: 0, advanced: 0, very_advanced: 0, withdrawn: 0 }
    for (const e of enrollments) {
      if (e.status === 'withdrawn') byTrack.withdrawn += 1
      else if (e.track && isTrack(e.track)) byTrack[e.track] += 1
    }

    const today = londonDateOnly(new Date())
    const schedule = FAST_OCCURRENCES.map((o) => ({
      track: o.track,
      index: o.index,
      total: o.total,
      startDate: o.startDate,
      startLabel: o.startLabel,
      endLabel: o.endLabel,
      daysUntil: daysBetweenDates(o.startDate, today),
    })).sort((a, b) => a.startDate.localeCompare(b.startDate))

    const reminders = await listReminderLog()
    const remindersByOccurrence: Record<string, { sent: number; failed: number; skipped: number }> = {}
    for (const entry of reminders) {
      const key = `${entry.track}:${entry.occurrence}:${entry.tag}`
      const bucket = (remindersByOccurrence[key] ||= { sent: 0, failed: 0, skipped: 0 })
      if (entry.result === 'sent' || entry.result === 'failed' || entry.result === 'skipped') bucket[entry.result] += 1
    }

    return Response.json({ enrollments, byTrack, schedule, reminders, remindersByOccurrence } satisfies {
      enrollments: typeof enrollments
      byTrack: typeof byTrack
      schedule: typeof schedule
      reminders: ReminderLogEntry[]
      remindersByOccurrence: typeof remindersByOccurrence
    })
  } catch (error) {
    return questError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireQuestAdmin()
    const body = await request.json().catch(() => ({}))
    const userId = String(body?.userId || '').trim()
    const action = String(body?.action || '')
    if (!userId) throw new QuestApiError('A participant is required')

    const eventId = await resolveEventId(body?.eventId ? String(body.eventId) : null)
    const participant = await getLiveParticipant(userId, eventId ?? undefined)
    if (!participant) throw new QuestApiError('That participant is not in this session', 404)

    const now = new Date().toISOString()
    const existing = participant.fasting_challenge
    // Carry the participant's own acknowledgments across untouched.
    const enrollment: FastingChallengeEnrollment = {
      opted_in: existing?.opted_in ?? false,
      track: existing?.track,
      status: existing?.status ?? 'enrolled',
      acknowledgments: existing?.acknowledgments ?? NO_ACKNOWLEDGMENTS,
      opted_in_at: existing?.opted_in_at,
      withdrawn_at: existing?.withdrawn_at,
      updated_at: now,
    }

    if (action === 'set-track') {
      if (!isTrack(body?.track)) throw new QuestApiError('Choose a valid track')
      enrollment.track = body.track
      enrollment.opted_in = true
      enrollment.status = 'enrolled'
      enrollment.opted_in_at = existing?.opted_in_at ?? now
    } else if (action === 'withdraw') {
      enrollment.opted_in = false
      enrollment.status = 'withdrawn'
      enrollment.withdrawn_at = now
    } else if (action === 'complete') {
      enrollment.status = 'completed'
    } else {
      throw new QuestApiError('Unknown challenge action')
    }

    participant.fasting_challenge = enrollment
    await saveLiveParticipant(participant)
    return Response.json({ enrollment })
  } catch (error) {
    return questError(error)
  }
}
