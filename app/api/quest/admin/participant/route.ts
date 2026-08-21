import { NextRequest } from 'next/server'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'
import { getLiveParticipant, saveLiveParticipant } from '@/lib/quest/live-store'
import type { AnswerAudit, LiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError, questError, requireQuestAdmin } from '@/lib/quest/server'

/**
 * Per-participant override field. The event-level `results_released` flag is
 * all-or-nothing, so this record-level flag lets one person see (or not see)
 * their results ahead of the room.
 *
 * CONTRACT FOR THE PARTICIPANT-FACING READER (owned elsewhere — not edited here):
 *   participant.results_released === true  -> results ARE released for this
 *     person even when the event flag is false.
 *   participant.results_released === false -> results are WITHHELD from this
 *     person even when the event flag is true.
 *   undefined -> fall back to the event-level flag.
 * Because `false` is meaningful, the reader must test with `=== true` /
 * `=== false` and never with a plain truthiness check.
 */
type ParticipantRecord = LiveParticipant & { results_released?: boolean }

const NOTE_MAX = 300

const QUESTIONS = QUEST_ASSESSMENT.questions

/**
 * Scoring must stay identical to app/api/quest/submit/route.ts: answer keys
 * 'A'..'E' score 0..4, Q1..Q25 fall into five sections of five questions
 * (max 20 each), and the total is their sum (max 100).
 */
function recomputeScores(participant: ParticipantRecord) {
  const sections = [0, 0, 0, 0, 0]
  Object.entries(participant.answers || {}).forEach(([id, key]) => {
    const index = Math.ceil(Number(id.slice(1)) / 5) - 1
    if (!Number.isFinite(index) || index < 0 || index > 4) return
    const score = 'ABCDE'.indexOf(key)
    if (score < 0) return
    sections[index] += score
  })
  participant.section_scores = sections
  participant.total_score = sections.reduce((a, b) => a + b, 0)
}

function summary(participant: ParticipantRecord) {
  return {
    user_id: participant.user_id,
    display_name: participant.display_name,
    submitted_at: participant.submitted_at ?? null,
    section_scores: participant.section_scores,
    total_score: participant.total_score,
    results_released: participant.results_released ?? null,
    answer_audit: participant.answer_audit ?? [],
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireQuestAdmin()
    const actor = session.email || session.name || session.userId || 'admin'
    const body = (await request.json().catch(() => ({}))) as {
      userId?: string
      eventId?: string | null
      action?: string
      questionId?: string
      answerKey?: string
      note?: string
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    if (!userId) throw new QuestApiError('A participant is required', 400)
    const action = body.action || ''

    const participant = (await getLiveParticipant(
      userId,
      body.eventId || undefined,
    )) as ParticipantRecord | null
    if (!participant) throw new QuestApiError('That participant is not in this session', 404)

    let audit: AnswerAudit | null = null

    switch (action) {
      case 'reopen': {
        if (!participant.submitted_at) {
          throw new QuestApiError('That assessment has not been submitted', 400)
        }
        // Answers and scores are deliberately left as they are — reopening
        // only lets the person edit and submit again.
        delete participant.submitted_at
        break
      }

      case 'override-answer': {
        const questionId = typeof body.questionId === 'string' ? body.questionId : ''
        const answerKey = typeof body.answerKey === 'string' ? body.answerKey : ''
        const note = typeof body.note === 'string' ? body.note.trim() : ''
        const question = QUESTIONS.find((item) => item.id === questionId)
        if (!question) throw new QuestApiError('That question does not exist', 400)
        if (!question.choices.some((choice) => choice.id === answerKey)) {
          throw new QuestApiError('That answer is not one of the choices for this question', 400)
        }
        if (!note) throw new QuestApiError('A note explaining the correction is required', 400)
        if (note.length > NOTE_MAX) {
          throw new QuestApiError(`Keep the note to ${NOTE_MAX} characters or fewer`, 400)
        }

        const previous = participant.answers?.[questionId]
        audit = {
          question_id: questionId,
          ...(previous ? { from: previous } : {}),
          to: answerKey,
          note,
          at: new Date().toISOString(),
          by: actor,
        }
        participant.answers = { ...(participant.answers || {}), [questionId]: answerKey }
        participant.answer_audit = [...(participant.answer_audit || []), audit]
        // Recompute from the answers rather than adjusting the stored totals,
        // so the scores can never drift away from what was answered.
        recomputeScores(participant)
        break
      }

      case 'release-results': {
        participant.results_released = true
        break
      }

      case 'hide-results': {
        participant.results_released = false
        break
      }

      case 'recompute': {
        recomputeScores(participant)
        break
      }

      default:
        throw new QuestApiError('Unknown participant action', 400)
    }

    await saveLiveParticipant(participant)
    return Response.json({ participant: summary(participant), audit })
  } catch (error) {
    return questError(error)
  }
}
