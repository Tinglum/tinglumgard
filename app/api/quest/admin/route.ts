import { NextRequest } from 'next/server'
import { deleteTemplate,getEventById,getLiveEvent,listLiveParticipants,listTemplates,saveTemplate,saveLiveEvent } from '@/lib/quest/live-store'
import { QuestApiError,questError,requireQuestAdmin } from '@/lib/quest/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

const sectionOf=(questionId:string)=>Math.ceil(Number(questionId.slice(1))/5)-1
const scoreOf=(key:string)=>Math.max(0,'ABCDE'.indexOf(key))

export async function GET(request:NextRequest){try{
  await requireQuestAdmin()
  // ?eventId lets the panel read an archived cohort instead of the live one.
  const requestedId=request.nextUrl.searchParams.get('eventId')
  const activeEvent=requestedId?await getEventById(requestedId):await getLiveEvent()
  const rows=activeEvent?await listLiveParticipants(activeEvent.id):[]

  const participants=await Promise.all(rows.map(async(p)=>{
    let email:string|null=null
    try{const {data}=await supabaseAdmin.auth.admin.getUserById(p.user_id);email=data.user?.email||null}catch{email=null}
    const entries=Object.entries(p.answers||{})
    return{
      id:p.id,user_id:p.user_id,display_name:p.display_name,email,
      answers:p.answers,answered_count:entries.length,
      current_question:Math.min(25,entries.length+1),
      earned_points:entries.reduce((sum,[,key])=>sum+scoreOf(key),0),
      section_scores:[0,1,2,3,4].map((i)=>entries.filter(([id])=>sectionOf(id)===i).reduce((sum,[,key])=>sum+scoreOf(key),0)),
      last_seen_at:p.last_seen_at,submitted_at:p.submitted_at??null,
      feedback:p.feedback||null,fasting_challenge:p.fasting_challenge||null,
      results_released:(p as {results_released?:boolean}).results_released??null,
      answer_audit:(p as {answer_audit?:unknown[]}).answer_audit||[],
    }
  }))

  const aggregates=[0,1,2,3,4].map((section)=>{
    const sectionAnswers=rows.flatMap((p)=>Object.entries(p.answers||{}).filter(([id])=>sectionOf(id)===section).map(([,key])=>scoreOf(key)))
    const participantCount=rows.filter((p)=>Object.keys(p.answers||{}).some((id)=>sectionOf(id)===section)).length
    const projectedAverage=sectionAnswers.length?(sectionAnswers.reduce((sum,score)=>sum+score,0)/sectionAnswers.length)*5:0
    return{section:section+1,average:Number(projectedAverage.toFixed(1)),responses:sectionAnswers.length,participants:participantCount}
  })

  const allAnswers=rows.flatMap((p)=>Object.values(p.answers||{}))
  const answerDistribution='ABCDE'.split('').map((answer,score)=>{
    const count=allAnswers.filter((value)=>value===answer).length
    return{answer,score,count,percent:allAnswers.length?Math.round(count/allAnswers.length*100):0}
  })

  return Response.json({
    events:activeEvent?[activeEvent]:[],activeEvent,participants,aggregates,answerDistribution,
    totalAnswers:allAnswers.length,
    releasedDistribution:activeEvent?.released_distribution||[],
    autoRelease:activeEvent?.auto_release||null,
    templates:await listTemplates(),
    isArchivedView:Boolean(requestedId),
  })
}catch(error){return questError(error)}}

export async function POST(request:NextRequest){try{
  await requireQuestAdmin()
  const body=await request.json()
  const action=String(body.action||'')
  let event=await getLiveEvent()
  const now=new Date().toISOString()

  if(action==='create'){
    if(event&&event.status!=='ended')throw new QuestApiError('End the current session before starting a new one')
    const name=String(body.name||'').trim().slice(0,100)
    const code=String(body.joinCode||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12)
    if(!name||code.length<4)throw new QuestApiError('Enter an event name and a code of at least four characters')
    event={id:randomUUID(),name,join_code_label:code,status:'paused',released_section:0,results_released:false,created_at:now,updated_at:now,released_distribution:[]}
    await saveLiveEvent(event)
    return Response.json({event})
  }

  if(!event)throw new QuestApiError('Create a session first')

  // When auto-release is on, opening a part schedules the next one. The panel
  // polls and fires 'release-next' once the time passes, so nothing releases
  // while the facilitator has the panel closed.
  const scheduleNext=()=>{
    if(!event)return
    if(event.auto_release?.enabled&&event.released_section<5)event.auto_release={...event.auto_release,nextAt:new Date(Date.now()+event.auto_release.minutes*60000).toISOString()}
    else if(event.auto_release)event.auto_release={...event.auto_release,nextAt:undefined}
  }

  if(action==='start-first'){
    if(event.released_section!==0)throw new QuestApiError('Part 1 has already been started')
    event.status='active';event.released_section=1;scheduleNext()
  }else if(action==='release-next'){
    if(event.status!=='active'||event.released_section>=5)throw new QuestApiError('The next section cannot be released')
    event.released_section+=1;scheduleNext()
  }else if(action==='set-auto-release'){
    const minutes=Number(body.minutes)
    const enabled=body.enabled===true
    if(enabled&&(!Number.isFinite(minutes)||minutes<1||minutes>120))throw new QuestApiError('Choose between 1 and 120 minutes per part')
    event.auto_release={enabled,minutes:enabled?Math.round(minutes):(event.auto_release?.minutes||10)}
    scheduleNext()
  }else if(action==='save-template'){
    const name=String(body.name||'').trim().slice(0,100)
    const code=String(body.joinCode||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12)
    if(!name||code.length<4)throw new QuestApiError('A template needs a name and a code of at least four characters')
    const templates=await saveTemplate({id:randomUUID(),name,join_code_label:code,created_at:now})
    return Response.json({templates})
  }else if(action==='delete-template'){
    const templates=await deleteTemplate(String(body.templateId||''))
    return Response.json({templates})
  }else if(action==='status'){
    if(!['active','paused','ended'].includes(body.status))throw new QuestApiError('Invalid event status')
    event.status=body.status
  }else if(action==='release-results'){
    if(event.released_section!==5)throw new QuestApiError('Release all five sections first')
    event.results_released=true
  }else if(action==='release-distribution'||action==='hide-distribution'){
    // Shows the room how everyone answered one part, on each participant's own
    // device, while they sit on the waiting screen between parts.
    const section=Number(body.section)
    if(!Number.isInteger(section)||section<1||section>5)throw new QuestApiError('Choose a part between 1 and 5')
    if(section>event.released_section)throw new QuestApiError('That part has not been released yet')
    const current=new Set(event.released_distribution||[])
    if(action==='release-distribution')current.add(section);else current.delete(section)
    event.released_distribution=Array.from(current).sort((a,b)=>a-b)
  }else throw new QuestApiError('Unknown admin action')

  event.updated_at=now
  await saveLiveEvent(event)
  return Response.json({event})
}catch(error){return questError(error)}}
