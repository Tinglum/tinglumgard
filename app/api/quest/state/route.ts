import { NextRequest } from 'next/server'
import { getLiveEvent,getLiveParticipant,listLiveParticipants } from '@/lib/quest/live-store'
import { questError,requireQuestUser } from '@/lib/quest/server'

const sectionOf=(questionId:string)=>Math.ceil(Number(questionId.slice(1))/5)

export async function GET(request:NextRequest){try{
  const user=await requireQuestUser(request)
  const participant=await getLiveParticipant(user.id)
  if(!participant)return Response.json({state:null})
  const event=await getLiveEvent()
  if(!event||event.id!==participant.event_id)return Response.json({state:null})

  const feedback=participant.feedback?{message:participant.feedback.message,updated_at:participant.feedback.updated_at,sent_at:participant.feedback.sent_at}:null

  // Cohort answer spread for any part the facilitator has chosen to show the
  // room. Counts only — never names, and never anyone's individual answer.
  const releasedDistribution=event.released_distribution||[]
  let distributions:Record<string,{section:number;respondents:number;questions:Array<{id:string;counts:number[];total:number}>}>|null=null
  if(releasedDistribution.length){
    const everyone=await listLiveParticipants(event.id)
    distributions={}
    for(const section of releasedDistribution){
      const questionIds=[1,2,3,4,5].map((n)=>`Q${(section-1)*5+n}`)
      distributions[String(section)]={
        section,
        respondents:everyone.filter((p)=>questionIds.some((id)=>p.answers?.[id])).length,
        questions:questionIds.map((id)=>{
          const counts='ABCDE'.split('').map((letter)=>everyone.filter((p)=>p.answers?.[id]===letter).length)
          return{id,counts,total:counts.reduce((a,b)=>a+b,0)}
        }),
      }
    }
  }

  // A per-participant override beats the event-wide flag in both directions,
  // so results can be given to one person early or withheld from one person.
  const override=(participant as {results_released?:boolean}).results_released
  const resultsReleased=typeof override==='boolean'?override:event.results_released

  return Response.json({state:{
    participant:{id:participant.id,display_name:participant.display_name,event_id:event.id,nutrition_events:{...event,results_released:resultsReleased}},
    attempt:{
      id:participant.id,
      status:participant.submitted_at?'submitted':'in_progress',
      started_at:participant.started_at,
      submitted_at:participant.submitted_at,
      section_scores:participant.section_scores,
      total_score:participant.total_score,
      nutrition_answers:Object.entries(participant.answers||{}).map(([question_id,answer_key])=>({question_id,answer_key,score:Math.max(0,'ABCDE'.indexOf(answer_key))})),
      feedback,
    },
    fastingChallenge:participant.fasting_challenge||null,
    releasedDistribution,
    distributions,
  }})
}catch(error){return questError(error)}}
