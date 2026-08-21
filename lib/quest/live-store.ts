import { supabaseAdmin } from '@/lib/supabase/server'

export type LiveEvent = { id:string; name:string; join_code_label:string; status:'active'|'paused'|'ended'; released_section:number; results_released:boolean; created_at:string; updated_at:string; released_distribution?:number[] }
export type ParticipantFeedback = { message:string; updated_at:string; sent_at?:string; sent_by?:string }
export type FastingChallengeTrack = 'standard' | 'advanced' | 'very_advanced'
export type FastingChallengeEnrollment = { opted_in:boolean; track?:FastingChallengeTrack; status:'enrolled'|'withdrawn'|'completed'; acknowledgments:{ understands_not_medical_advice:boolean; agrees_to_stop_if_unwell:boolean; confirms_prior_experience:boolean }; opted_in_at?:string; withdrawn_at?:string; updated_at:string }
export type AnswerAudit = { question_id:string; from?:string; to:string; note:string; at:string; by:string }
export type LiveParticipant = { id:string; user_id:string; event_id:string; display_name:string; last_seen_at:string; started_at:string; submitted_at?:string; answers:Record<string,string>; section_scores:number[]; total_score:number; feedback?:ParticipantFeedback; fasting_challenge?:FastingChallengeEnrollment; answer_audit?:AnswerAudit[] }

// ── Key layout ────────────────────────────────────────────────────────────
// Sessions used to live under one fixed key, so creating a new one destroyed
// the previous session, and participants were keyed by user alone, so a
// returning participant's answers were overwritten when they joined again.
// Both are now scoped by event id. The legacy keys are still read as a
// fallback and are deliberately left in place rather than deleted.
const LEGACY_EVENT_KEY='nutrition_live_event'
const legacyParticipantKey=(userId:string)=>`nutrition_participant_${userId}`
const ACTIVE_POINTER_KEY='nutrition_active_event'
const EVENT_INDEX_KEY='nutrition_event_index'
const eventKey=(eventId:string)=>`nutrition_event_${eventId}`
const participantKey=(eventId:string,userId:string)=>`nutrition_participant_${eventId}_${userId}`
// A legacy participant key is `nutrition_participant_<uuid>`; the scoped form
// is `nutrition_participant_<uuid>_<uuid>`. UUIDs contain hyphens, never
// underscores, so the presence of an underscore in the suffix separates them.
const isScopedParticipantKey=(key:string)=>key.slice('nutrition_participant_'.length).includes('_')

async function read<T>(key:string):Promise<T|null>{const {data,error}=await supabaseAdmin.from('app_config').select('value').eq('key',key).maybeSingle();if(error)throw error;if(!data?.value)return null;return (typeof data.value==='string'?JSON.parse(data.value):data.value) as T}
async function write(key:string,value:unknown){const {error}=await supabaseAdmin.from('app_config').upsert({key,value:JSON.stringify(value)},{onConflict:'key'});if(error)throw error}
async function readRows(prefix:string){const {data,error}=await supabaseAdmin.from('app_config').select('key,value').like('key',`${prefix}%`);if(error)throw error;return (data||[]) as Array<{key:string;value:any}>}
const parse=<T,>(value:any):T=>(typeof value==='string'?JSON.parse(value):value) as T

// ── Migration ─────────────────────────────────────────────────────────────
// Idempotent and copy-only: nothing is deleted, so a failure part-way through
// leaves the old layout intact and readable.
let migrationDone=false
export async function ensureMigrated(){
  if(migrationDone)return
  const pointer=await read<{id:string|null}>(ACTIVE_POINTER_KEY)
  if(pointer){migrationDone=true;return}
  const legacyEvent=await read<LiveEvent>(LEGACY_EVENT_KEY)
  if(!legacyEvent){await write(EVENT_INDEX_KEY,[]);await write(ACTIVE_POINTER_KEY,{id:null});migrationDone=true;return}
  await write(eventKey(legacyEvent.id),legacyEvent)
  await write(EVENT_INDEX_KEY,[legacyEvent.id])
  const rows=await readRows('nutrition_participant_')
  for(const row of rows){
    if(isScopedParticipantKey(row.key))continue
    const p=parse<LiveParticipant>(row.value)
    if(!p?.user_id||p.event_id!==legacyEvent.id)continue
    await write(participantKey(legacyEvent.id,p.user_id),p)
  }
  await write(ACTIVE_POINTER_KEY,{id:legacyEvent.id})
  migrationDone=true
}

// ── Events ────────────────────────────────────────────────────────────────
export async function listEventIds():Promise<string[]>{await ensureMigrated();return (await read<string[]>(EVENT_INDEX_KEY))||[]}
export async function getEventById(eventId:string):Promise<LiveEvent|null>{await ensureMigrated();return read<LiveEvent>(eventKey(eventId))}
export async function listEvents():Promise<LiveEvent[]>{
  const ids=await listEventIds()
  const events=await Promise.all(ids.map((id)=>read<LiveEvent>(eventKey(id))))
  return events.filter(Boolean) as LiveEvent[]
}
export async function getLiveEvent():Promise<LiveEvent|null>{
  await ensureMigrated()
  const pointer=await read<{id:string|null}>(ACTIVE_POINTER_KEY)
  if(!pointer?.id)return null
  return read<LiveEvent>(eventKey(pointer.id))
}
export async function saveLiveEvent(event:LiveEvent){
  await ensureMigrated()
  await write(eventKey(event.id),event)
  const ids=(await read<string[]>(EVENT_INDEX_KEY))||[]
  if(!ids.includes(event.id))await write(EVENT_INDEX_KEY,[event.id,...ids])
  await write(ACTIVE_POINTER_KEY,{id:event.id})
  // Keep the legacy key tracking the current session so any reader that has
  // not been migrated yet still sees something coherent.
  await write(LEGACY_EVENT_KEY,event)
}

// ── Participants ──────────────────────────────────────────────────────────
export async function getLiveParticipant(userId:string,eventId?:string):Promise<LiveParticipant|null>{
  await ensureMigrated()
  const scopeId=eventId??(await read<{id:string|null}>(ACTIVE_POINTER_KEY))?.id
  if(!scopeId)return read<LiveParticipant>(legacyParticipantKey(userId))
  const scoped=await read<LiveParticipant>(participantKey(scopeId,userId))
  if(scoped)return scoped
  const legacy=await read<LiveParticipant>(legacyParticipantKey(userId))
  return legacy&&legacy.event_id===scopeId?legacy:null
}
export async function saveLiveParticipant(participant:LiveParticipant){
  await ensureMigrated()
  await write(participantKey(participant.event_id,participant.user_id),participant)
}
export async function listLiveParticipants(eventId?:string):Promise<LiveParticipant[]>{
  await ensureMigrated()
  const rows=await readRows('nutrition_participant_')
  const byId=new Map<string,LiveParticipant>()
  // Scoped keys win over legacy ones for the same (event,user) pair.
  for(const row of rows.sort((a,b)=>Number(isScopedParticipantKey(a.key))-Number(isScopedParticipantKey(b.key)))){
    const p=parse<LiveParticipant>(row.value)
    if(!p?.user_id)continue
    byId.set(`${p.event_id}_${p.user_id}`,p)
  }
  const all=Array.from(byId.values())
  return eventId?all.filter((p)=>p.event_id===eventId):all
}
