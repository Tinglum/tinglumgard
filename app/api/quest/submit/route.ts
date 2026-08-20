import { NextRequest } from 'next/server'
import { getLiveEvent,getLiveParticipant,saveLiveParticipant } from '@/lib/quest/live-store'
import { QuestApiError,questError,requireQuestUser } from '@/lib/quest/server'

const ALL_QUESTION_IDS = Array.from({ length: 25 }, (_, index) => `Q${index + 1}`)

export async function POST(request:NextRequest){try{
  const user=await requireQuestUser(request)
  const event=await getLiveEvent()
  const p=await getLiveParticipant(user.id)

  // These were previously one condition reporting "All 25 questions must be
  // answered" for every cause, which sent people hunting for a missing answer
  // when the real problem was a paused session or an unreleased part.
  if(!p)throw new QuestApiError('Join the session before submitting',404)
  if(!event)throw new QuestApiError('There is no active session to submit to')
  if(event.status==='paused')throw new QuestApiError('The facilitator has paused the session. Your answers are saved — try again once it resumes.')
  if(event.status==='ended')throw new QuestApiError('This session has been closed by the facilitator, so it can no longer take submissions. Your answers are saved — ask the facilitator to reopen it.')
  if(event.status!=='active')throw new QuestApiError('This session is not open for submissions right now. Your answers are saved.')
  if(event.released_section!==5)throw new QuestApiError(`Only ${event.released_section} of 5 parts have been released so far, so the assessment cannot be submitted yet.`)
  const missing=ALL_QUESTION_IDS.filter((id)=>!p.answers[id])
  if(missing.length)throw new QuestApiError(`These answers did not reach the server: ${missing.join(', ')}. Open each one again and re-select your answer.`)

  p.section_scores=[0,0,0,0,0]
  Object.entries(p.answers).forEach(([id,key])=>{p.section_scores[Math.ceil(Number(id.slice(1))/5)-1]+='ABCDE'.indexOf(key)})
  p.total_score=p.section_scores.reduce((a,b)=>a+b,0)
  p.submitted_at=new Date().toISOString()
  p.last_seen_at=p.submitted_at
  await saveLiveParticipant(p)
  return Response.json({result:p})
}catch(error){return questError(error)}}
