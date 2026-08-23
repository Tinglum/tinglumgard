import { NextRequest } from 'next/server'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'
import { blankResponse, getOpenResponse, isValidToken, saveOpenResponse, scoreAnswers } from '@/lib/quest/open-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token
    if (!isValidToken(token)) return Response.json({ error: 'Invalid session' }, { status: 400 })

    const questionId = String(body.questionId || '')
    const answerKey = String(body.answerKey || '')
    // Never trust the client about what a valid question or answer is.
    const question = QUEST_ASSESSMENT.questions.find((item) => item.id === questionId)
    if (!question) return Response.json({ error: 'Unknown question' }, { status: 400 })
    if (!question.choices.some((choice) => choice.id === answerKey)) {
      return Response.json({ error: 'Unknown answer' }, { status: 400 })
    }

    const response = (await getOpenResponse(token)) || blankResponse(token)
    if (response.submitted_at) return Response.json({ error: 'This assessment has already been submitted.' }, { status: 409 })

    response.answers = { ...response.answers, [questionId]: answerKey }
    const { section_scores, total_score } = scoreAnswers(response.answers)
    response.section_scores = section_scores
    response.total_score = total_score
    response.updated_at = new Date().toISOString()
    await saveOpenResponse(response)

    return Response.json({ answered: Object.keys(response.answers).length })
  } catch (error) {
    console.error('quest-open-answer', error)
    return Response.json({ error: 'Could not save that answer.' }, { status: 500 })
  }
}
