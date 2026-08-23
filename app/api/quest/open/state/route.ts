import { NextRequest } from 'next/server'
import { blankResponse, challengeStillOpen, getOpenResponse, isValidToken, saveOpenResponse } from '@/lib/quest/open-store'

// Resume point for the open assessment. Creates the record on first sight of a
// token so a half-finished run survives a reload or a dropped connection.
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || ''
    if (!isValidToken(token)) return Response.json({ error: 'Invalid session' }, { status: 400 })

    let response = await getOpenResponse(token)
    if (!response) {
      response = blankResponse(token)
      await saveOpenResponse(response)
    }

    return Response.json({
      state: {
        answers: response.answers || {},
        submitted_at: response.submitted_at ?? null,
        section_scores: response.section_scores,
        total_score: response.total_score,
        email: response.email ?? null,
        display_name: response.display_name ?? null,
        fasting_challenge: response.fasting_challenge ?? null,
      },
      challengeOpen: challengeStillOpen(),
    })
  } catch (error) {
    console.error('quest-open-state', error)
    return Response.json({ error: 'Could not load your progress.' }, { status: 500 })
  }
}
