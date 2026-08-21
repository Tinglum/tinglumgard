import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { getEventById, getLiveEvent, listLiveParticipants, type LiveEvent, type LiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError, questError, requireQuestAdmin } from '@/lib/quest/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MESSAGE_LIMIT = 5000
const SUBJECT_LIMIT = 200
const CHALLENGE_TRACKS = ['standard', 'advanced', 'very_advanced', 'none'] as const
type ChallengeTrack = (typeof CHALLENGE_TRACKS)[number]

type Segment = {
  submittedOnly?: boolean
  minTotal?: number
  maxTotal?: number
  section?: number
  sectionMax?: number
  challengeTrack?: ChallengeTrack
}

export async function POST(request: NextRequest) {
  try {
    await requireQuestAdmin()
    const body = await request.json().catch(() => ({}))

    const subject = String(body?.subject || '').trim()
    const message = String(body?.message || '').trim()
    const dryRun = body?.dryRun === true
    if (!subject) throw new QuestApiError('A subject line is required')
    if (subject.length > SUBJECT_LIMIT) throw new QuestApiError(`Keep the subject under ${SUBJECT_LIMIT} characters`)
    if (!message) throw new QuestApiError('A message is required')
    if (message.length > MESSAGE_LIMIT) throw new QuestApiError(`Keep the message under ${MESSAGE_LIMIT} characters`)

    const segment = normaliseSegment(body?.segment)

    const eventId = String(body?.eventId || '').trim()
    const event: LiveEvent | null = eventId ? await getEventById(eventId) : await getLiveEvent()
    if (!event) throw new QuestApiError(eventId ? 'That questionnaire session was not found' : 'No active questionnaire session', 404)

    const matched = (await listLiveParticipants(event.id)).filter((participant) => matchesSegment(participant, segment))
    matched.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''))

    if (dryRun) {
      const recipients = await Promise.all(
        matched.map(async (participant) => ({
          display_name: participant.display_name || '',
          email: (await lookupEmail(participant.user_id)) || '',
          total_score: participant.total_score ?? 0,
        }))
      )
      return Response.json({ dryRun: true, count: recipients.length, recipients })
    }

    // The subject fingerprint is what separates one broadcast from the next.
    // Two genuinely different broadcasts produce different keys and both go
    // out; a double-submit of the same subject to the same participant in the
    // same session produces the identical key, and the email queue drops the
    // duplicate rather than mailing the cohort twice.
    const subjectFingerprint = createHash('sha256').update(`${subject}\n${message}`).digest('hex').slice(0, 16)

    let sent = 0
    let skipped = 0
    const failures: Array<{ display_name: string; reason: string }> = []

    for (const participant of matched) {
      const email = await lookupEmail(participant.user_id)
      if (!email) {
        skipped += 1
        continue
      }
      try {
        const result = await dispatchEmail({
          to: email,
          subject,
          html: buildBroadcastHtml({ displayName: participant.display_name || 'there', message, sessionName: event.name }),
          classification: 'transactional',
          locale: 'en',
          sourcePath: 'api.quest.admin.broadcast',
          templateKey: 'quest.admin.broadcast',
          flowKey: 'quest.admin.broadcast',
          sendImmediately: true,
          metadata: { event_id: event.id, participant_id: participant.id },
          idempotency: {
            source: 'api.quest.admin.broadcast',
            entity: 'quest_participant',
            id: `${event.id}:${participant.user_id}:${subjectFingerprint}`,
            template: 'quest.admin.broadcast',
          },
        })
        if (result.success) sent += 1
        else if (result.skipped) skipped += 1
        else failures.push({ display_name: participant.display_name || email, reason: result.error || 'Send failed' })
      } catch (sendError) {
        failures.push({
          display_name: participant.display_name || email,
          reason: sendError instanceof Error ? sendError.message : 'Send failed',
        })
      }
    }

    return Response.json({ sent, skipped, failures, matched: matched.length })
  } catch (error) {
    return questError(error)
  }
}

function normaliseSegment(raw: unknown): Segment {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const segment: Segment = {}

  if (input.submittedOnly === true) segment.submittedOnly = true

  const minTotal = toNumber(input.minTotal)
  if (minTotal !== undefined) {
    if (minTotal < 0 || minTotal > 100) throw new QuestApiError('Minimum total score must be between 0 and 100')
    segment.minTotal = minTotal
  }
  const maxTotal = toNumber(input.maxTotal)
  if (maxTotal !== undefined) {
    if (maxTotal < 0 || maxTotal > 100) throw new QuestApiError('Maximum total score must be between 0 and 100')
    segment.maxTotal = maxTotal
  }
  if (segment.minTotal !== undefined && segment.maxTotal !== undefined && segment.minTotal > segment.maxTotal) {
    throw new QuestApiError('The minimum total score cannot be higher than the maximum')
  }

  const section = toNumber(input.section)
  const sectionMax = toNumber(input.sectionMax)
  if (section !== undefined) {
    if (!Number.isInteger(section) || section < 1 || section > 5) throw new QuestApiError('Section must be a number from 1 to 5')
    if (sectionMax === undefined) throw new QuestApiError('Choose a section score cut-off to filter by section')
    if (sectionMax < 0 || sectionMax > 20) throw new QuestApiError('The section score cut-off must be between 0 and 20')
    segment.section = section
    segment.sectionMax = sectionMax
  } else if (sectionMax !== undefined) {
    throw new QuestApiError('Choose which section the score cut-off applies to')
  }

  const track = typeof input.challengeTrack === 'string' ? input.challengeTrack.trim() : ''
  if (track) {
    if (!CHALLENGE_TRACKS.includes(track as ChallengeTrack)) throw new QuestApiError('Unknown fasting challenge track')
    segment.challengeTrack = track as ChallengeTrack
  }

  if (Object.keys(segment).length === 0) {
    throw new QuestApiError('Choose at least one filter — a broadcast must target a segment, not everyone by accident')
  }
  return segment
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new QuestApiError('Segment score filters must be numbers')
  return parsed
}

function matchesSegment(participant: LiveParticipant, segment: Segment) {
  if (segment.submittedOnly && !participant.submitted_at) return false

  const total = participant.total_score ?? 0
  if (segment.minTotal !== undefined && total < segment.minTotal) return false
  if (segment.maxTotal !== undefined && total > segment.maxTotal) return false

  if (segment.section !== undefined && segment.sectionMax !== undefined) {
    const sectionScore = participant.section_scores?.[segment.section - 1] ?? 0
    if (sectionScore > segment.sectionMax) return false
  }

  if (segment.challengeTrack) {
    const enrolment = participant.fasting_challenge
    const enrolled = Boolean(enrolment?.opted_in) && enrolment?.status === 'enrolled'
    if (segment.challengeTrack === 'none') {
      if (enrolled) return false
    } else if (!enrolled || enrolment?.track !== segment.challengeTrack) {
      return false
    }
  }

  return true
}

async function lookupEmail(userId: string) {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
    return data.user?.email || null
  } catch {
    return null
  }
}

function buildBroadcastHtml(params: { displayName: string; message: string; sessionName: string }) {
  const body = escapeHtml(params.message).replace(/\r\n|\r|\n/g, '<br>')
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
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="title">Nutrition Fitness</div>
      <p class="muted">${escapeHtml(params.sessionName)}</p>
      <p>Hi ${escapeHtml(params.displayName)},</p>
      <div>${body}</div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character))
}
