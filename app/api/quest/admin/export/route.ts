import { NextRequest } from 'next/server'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'
import { getEventById, getLiveEvent, listLiveParticipants, type LiveEvent, type LiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError, questError, requireQuestAdmin } from '@/lib/quest/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Byte-order mark, built from its code point so no editor can silently eat it. */
const BOM = String.fromCharCode(0xfeff)

/** Questions in stable Q1..Q25 order, independent of authoring order in content.ts. */
const ORDERED_QUESTIONS = [...QUEST_ASSESSMENT.questions].sort((a, b) => a.order - b.order)

type ExportRow = {
  display_name: string
  email: string
  joined_at: string
  last_seen_at: string
  submitted_at: string
  answered_count: number
  total_score: number
  section_scores: number[]
  fasting_track: string
  fasting_status: string
  answers: Record<string, string>
  scores: Record<string, number | ''>
}

export async function GET(request: NextRequest) {
  try {
    await requireQuestAdmin()

    const url = new URL(request.url)
    const eventId = url.searchParams.get('eventId')?.trim() || ''
    const format = (url.searchParams.get('format') || 'csv').toLowerCase()
    if (format !== 'csv' && format !== 'json') {
      throw new QuestApiError('Unsupported export format. Use csv or json.')
    }

    const event: LiveEvent | null = eventId ? await getEventById(eventId) : await getLiveEvent()
    if (!event) throw new QuestApiError(eventId ? 'That questionnaire session was not found' : 'No active questionnaire session', 404)

    const participants = await listLiveParticipants(event.id)
    participants.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''))

    const emails = await resolveEmails(participants)
    const rows = participants.map((participant) => toExportRow(participant, emails.get(participant.user_id) || ''))

    const filename = `nutrition-${slugify(event.name)}-${new Date().toISOString().slice(0, 10)}.csv`

    if (format === 'json') {
      return Response.json({
        event: { id: event.id, name: event.name, join_code_label: event.join_code_label, status: event.status },
        generated_at: new Date().toISOString(),
        count: rows.length,
        participants: rows,
      })
    }

    // A UTF-8 BOM makes Excel read the file as UTF-8 rather than the local
    // codepage, which is what keeps æ/ø/å intact for Norwegian names.
    const csv = BOM + buildCsv(rows)
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return questError(error)
  }
}

async function resolveEmails(participants: LiveParticipant[]) {
  const emails = new Map<string, string>()
  await Promise.all(
    participants.map(async (participant) => {
      try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(participant.user_id)
        if (data.user?.email) emails.set(participant.user_id, data.user.email)
      } catch {
        // A participant whose auth record cannot be read still belongs in the
        // export — the email column is simply left blank for them.
      }
    })
  )
  return emails
}

function toExportRow(participant: LiveParticipant, email: string): ExportRow {
  const answers = participant.answers || {}
  const perQuestionAnswer: Record<string, string> = {}
  const perQuestionScore: Record<string, number | ''> = {}
  for (const question of ORDERED_QUESTIONS) {
    const key = answers[question.id] || ''
    perQuestionAnswer[question.id] = key
    const choice = question.choices.find((item) => item.id === key)
    perQuestionScore[question.id] = choice ? choice.score : ''
  }
  const sectionScores = Array.from({ length: 5 }, (_, index) => participant.section_scores?.[index] ?? 0)
  return {
    display_name: participant.display_name || '',
    email,
    joined_at: participant.started_at || '',
    last_seen_at: participant.last_seen_at || '',
    submitted_at: participant.submitted_at || '',
    answered_count: ORDERED_QUESTIONS.filter((question) => Boolean(answers[question.id])).length,
    total_score: participant.total_score ?? 0,
    section_scores: sectionScores,
    fasting_track: participant.fasting_challenge?.opted_in ? participant.fasting_challenge.track || '' : '',
    fasting_status: participant.fasting_challenge?.opted_in ? participant.fasting_challenge.status : 'not_joined',
    answers: perQuestionAnswer,
    scores: perQuestionScore,
  }
}

function buildCsv(rows: ExportRow[]) {
  const sectionTitles = [...QUEST_ASSESSMENT.sections].sort((a, b) => a.order - b.order).map((section) => section.title.en)
  const header = [
    'Display name',
    'Email',
    'Joined at',
    'Last seen',
    'Submitted at',
    'Answered count',
    'Total score',
    ...sectionTitles.map((title, index) => `Section ${index + 1} score (${title})`),
    'Fasting track',
    'Fasting status',
    ...ORDERED_QUESTIONS.map((question) => `${question.id} answer`),
    ...ORDERED_QUESTIONS.map((question) => `${question.id} score`),
  ]
  const lines = [header.map(csvCell).join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.display_name,
        row.email,
        row.joined_at,
        row.last_seen_at,
        row.submitted_at,
        row.answered_count,
        row.total_score,
        ...row.section_scores,
        row.fasting_track,
        row.fasting_status,
        ...ORDERED_QUESTIONS.map((question) => row.answers[question.id]),
        ...ORDERED_QUESTIONS.map((question) => row.scores[question.id]),
      ]
        .map(csvCell)
        .join(',')
    )
  }
  // CRLF is what Excel expects for a downloaded CSV.
  return lines.join('\r\n')
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function slugify(value: string) {
  return (
    value
      .replace(/[æÆ]/g, 'ae')
      .replace(/[øØ]/g, 'o')
      .replace(/[åÅ]/g, 'a')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'session'
  )
}
