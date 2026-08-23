import { NextRequest } from 'next/server'
import { getEventById, getLiveEvent, listEvents, listLiveParticipants } from '@/lib/quest/live-store'
import type { LiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError, questError, requireQuestAdmin } from '@/lib/quest/server'
import { listOpenResponses, type OpenResponse } from '@/lib/quest/open-store'
import { supabaseAdmin } from '@/lib/supabase/server'

const SECTION_COUNT = 5
// Not exported: a Next route file may only export handlers and route config.
const OPEN_POOL_ID = 'open-assessments'

function openPoolSummary(responses: OpenResponse[]) {
  const submitted = responses.filter((r) => Boolean(r.submitted_at))
  const averageSections = Array.from({ length: SECTION_COUNT }, (_, index) =>
    submitted.length ? round1(submitted.reduce((sum, r) => sum + Number(r.section_scores?.[index] || 0), 0) / submitted.length) : 0,
  )
  return {
    id: OPEN_POOL_ID,
    name: 'Open assessments',
    join_code_label: 'OPEN LINK',
    status: 'active' as const,
    released_section: 5,
    results_released: true,
    created_at: responses.map((r) => r.created_at).sort()[0] || new Date().toISOString(),
    updated_at: responses.map((r) => r.updated_at).sort().pop() || new Date().toISOString(),
    participant_count: responses.length,
    submitted_count: submitted.length,
    average_total: submitted.length ? round1(submitted.reduce((sum, r) => sum + Number(r.total_score || 0), 0) / submitted.length) : 0,
    average_sections: averageSections,
    is_current: false,
  }
}

const round1 = (value: number) => Number(value.toFixed(1))

const sectionOf = (questionId: string) => Math.ceil(Number(questionId.slice(1)) / 5) - 1

function sectionScores(participant: LiveParticipant): number[] {
  const stored = Array.isArray(participant.section_scores) ? participant.section_scores : []
  if (stored.length === SECTION_COUNT) return stored.map((value) => Number(value) || 0)
  return Array.from({ length: SECTION_COUNT }, (_, index) =>
    Object.entries(participant.answers || {})
      .filter(([id]) => sectionOf(id) === index)
      .reduce((sum, [, key]) => sum + Math.max(0, 'ABCDE'.indexOf(key)), 0),
  )
}

function totalScore(participant: LiveParticipant): number {
  if (typeof participant.total_score === 'number') return participant.total_score
  return sectionScores(participant).reduce((sum, value) => sum + value, 0)
}

export async function GET(request: NextRequest) {
  try {
    await requireQuestAdmin()
    const eventId = request.nextUrl.searchParams.get('id')
    const currentEvent = await getLiveEvent()

    // The open assessment has no event of its own — it is a rolling pool that
    // anyone can complete at any time — so it is presented as one pseudo
    // session kept deliberately apart from the live cohorts, whose numbers it
    // must never contaminate.
    if (eventId === OPEN_POOL_ID) {
      const responses = (await listOpenResponses()).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      return Response.json({
        session: openPoolSummary(responses),
        participants: responses.map((r) => ({
          id: r.token,
          display_name: r.display_name || 'Anonymous',
          email: r.email || null,
          answers: r.answers || {},
          answered_count: Object.keys(r.answers || {}).length,
          section_scores: r.section_scores || [0, 0, 0, 0, 0],
          total_score: r.total_score || 0,
          submitted_at: r.submitted_at || null,
          last_seen_at: r.updated_at,
          fasting_challenge: r.fasting_challenge || null,
        })),
      })
    }

    if (eventId) {
      const session = await getEventById(eventId)
      if (!session) throw new QuestApiError('Session not found', 404)
      const rows = await listLiveParticipants(session.id)
      const participants = await Promise.all(
        rows.map(async (p) => {
          let email: string | null = null
          try {
            const { data } = await supabaseAdmin.auth.admin.getUserById(p.user_id)
            email = data?.user?.email || null
          } catch {
            email = null
          }
          return {
            id: p.id,
            display_name: p.display_name,
            email,
            answers: p.answers || {},
            answered_count: Object.keys(p.answers || {}).length,
            section_scores: sectionScores(p),
            total_score: totalScore(p),
            submitted_at: p.submitted_at || null,
            last_seen_at: p.last_seen_at,
            fasting_challenge: p.fasting_challenge || null,
          }
        }),
      )
      return Response.json({ session, participants })
    }

    const events = await listEvents()
    const sessions = await Promise.all(
      events.map(async (event) => {
        const rows = await listLiveParticipants(event.id)
        const submitted = rows.filter((p) => Boolean(p.submitted_at))
        const averageSections = Array.from({ length: SECTION_COUNT }, (_, index) =>
          submitted.length
            ? round1(submitted.reduce((sum, p) => sum + (sectionScores(p)[index] || 0), 0) / submitted.length)
            : 0,
        )
        return {
          id: event.id,
          name: event.name,
          join_code_label: event.join_code_label,
          status: event.status,
          released_section: event.released_section,
          results_released: event.results_released,
          created_at: event.created_at,
          participant_count: rows.length,
          submitted_count: submitted.length,
          average_total: submitted.length
            ? round1(submitted.reduce((sum, p) => sum + totalScore(p), 0) / submitted.length)
            : 0,
          average_sections: averageSections,
          is_current: Boolean(currentEvent && currentEvent.id === event.id),
        }
      }),
    )

    // Listed alongside the cohorts but never mixed into one: it is a standing
    // pool rather than an event, and it has no join code or facilitator.
    const openPool = openPoolSummary(await listOpenResponses())
    return Response.json({ sessions: [...sessions, openPool] })
  } catch (error) {
    return questError(error)
  }
}
