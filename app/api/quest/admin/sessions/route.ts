import { NextRequest } from 'next/server'
import { getEventById, getLiveEvent, listEvents, listLiveParticipants } from '@/lib/quest/live-store'
import type { LiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError, questError, requireQuestAdmin } from '@/lib/quest/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const SECTION_COUNT = 5

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

    return Response.json({ sessions })
  } catch (error) {
    return questError(error)
  }
}
