import { NextRequest } from 'next/server'
import { FastingChallengeTrack, getLiveEvent, getLiveParticipant, saveLiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError, questError, requireQuestUser } from '@/lib/quest/server'

export async function GET(request:NextRequest){try{const user=await requireQuestUser(request);const participant=await getLiveParticipant(user.id);if(!participant)throw new QuestApiError('Join the questionnaire before choosing a challenge',404);return Response.json({challenge:participant.fasting_challenge||null})}catch(error){return questError(error)}}

export async function PUT(request:NextRequest){try{
  const user=await requireQuestUser(request);const participant=await getLiveParticipant(user.id);if(!participant)throw new QuestApiError('Join the questionnaire before choosing a challenge',404)
  const body=await request.json();const now=new Date().toISOString()
  if(body.optedIn!==true){participant.fasting_challenge={opted_in:false,status:'withdrawn',acknowledgments:{understands_not_medical_advice:false,agrees_to_stop_if_unwell:false,confirms_prior_experience:false},opted_in_at:participant.fasting_challenge?.opted_in_at,withdrawn_at:now,updated_at:now};await saveLiveParticipant(participant);return Response.json({challenge:participant.fasting_challenge})}
  const event=await getLiveEvent();if(!participant.submitted_at||!event||participant.event_id!==event.id||!event.results_released)throw new QuestApiError('Complete the assessment and wait for results before joining the challenge',409)
  const track=String(body.track||'') as FastingChallengeTrack;if(!['standard','advanced','very_advanced'].includes(track))throw new QuestApiError('Choose a valid challenge track')
  const acknowledgments={understands_not_medical_advice:body.acknowledgments?.understandsNotMedicalAdvice===true,agrees_to_stop_if_unwell:body.acknowledgments?.agreesToStopIfUnwell===true,confirms_prior_experience:body.acknowledgments?.confirmsPriorExperience===true};if(!acknowledgments.understands_not_medical_advice||!acknowledgments.agrees_to_stop_if_unwell||track!=='standard'&&!acknowledgments.confirms_prior_experience)throw new QuestApiError('Confirm the safety acknowledgments before joining')
  participant.fasting_challenge={opted_in:true,track,status:'enrolled',acknowledgments,opted_in_at:participant.fasting_challenge?.opted_in_at||now,updated_at:now};await saveLiveParticipant(participant);return Response.json({challenge:participant.fasting_challenge})
}catch(error){return questError(error)}}
