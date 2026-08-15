import { NextRequest } from 'next/server'
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'

export async function requireQuestUser(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new QuestApiError('Sign in required', 401)
  const { data, error } = await supabaseServer.auth.getUser(token)
  if (error || !data.user) throw new QuestApiError('Session expired', 401)
  return data.user
}

export async function requireQuestAdmin() {
  const session = await getSession()
  if (!session || (!session.isAdmin && session.role !== 'admin')) {
    throw new QuestApiError('Administrator access required', 401)
  }
  return session
}

export class QuestApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export function questError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected questionnaire error'
  const status = error instanceof QuestApiError ? error.status : 500
  return Response.json({ error: message }, { status })
}

export async function getParticipantState(userId: string) {
  const { data: participant, error } = await supabaseAdmin
    .from('nutrition_event_participants')
    .select('id, display_name, event_id, nutrition_events(id, name, status, released_section, results_released)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!participant) return null

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from('nutrition_attempts')
    .select('id, status, started_at, submitted_at, section_scores, total_score, nutrition_answers(question_id, answer_key, score, updated_at)')
    .eq('participant_id', participant.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (attemptError) throw attemptError
  return { participant, attempt }
}

export async function ensureNutritionAssessment() {
  const { data: existing } = await supabaseAdmin.from('nutrition_assessment_versions').select('id').eq('slug', QUEST_ASSESSMENT.id).eq('version', QUEST_ASSESSMENT.version).maybeSingle()
  if (existing) return existing.id
  const { data: version, error } = await supabaseAdmin.from('nutrition_assessment_versions').insert({
    slug: QUEST_ASSESSMENT.id, version: QUEST_ASSESSMENT.version,
    title_i18n: { en: 'Nutrition Fitness Assessment', no: 'Vurdering av ernæringsfitness' },
    default_language: 'en', supported_languages: ['en','no'], is_active: true,
  }).select('id').single()
  if (error) throw error
  for (const section of QUEST_ASSESSMENT.sections) {
    const { data: sectionRow, error: sectionError } = await supabaseAdmin.from('nutrition_sections').insert({ assessment_version_id: version.id, section_number: section.order, title_i18n: { en: section.title.en, no: section.title.nb }, description_i18n: { en: section.description.en, no: section.description.nb } }).select('id').single()
    if (sectionError) throw sectionError
    for (const question of section.questions) {
      const { data: questionRow, error: questionError } = await supabaseAdmin.from('nutrition_questions').insert({ section_id: sectionRow.id, question_number: question.order, prompt_i18n: { en: question.prompt.en, no: question.prompt.nb }, context_i18n: question.context ? { en: question.context.en, no: question.context.nb } : null }).select('id').single()
      if (questionError) throw questionError
      const { error: choicesError } = await supabaseAdmin.from('nutrition_choices').insert(question.choices.map((choice) => ({ question_id: questionRow.id, answer_key: choice.id, score: choice.score, text_i18n: { en: choice.text.en, no: choice.text.nb } })))
      if (choicesError) throw choicesError
    }
  }
  return version.id
}
