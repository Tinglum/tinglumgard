import { supabaseAdmin } from '@/lib/supabase/server'

export type LiveEvent = { id:string; name:string; join_code_label:string; status:'active'|'paused'|'ended'; released_section:number; results_released:boolean; created_at:string; updated_at:string }
export type ParticipantFeedback = { message:string; updated_at:string; sent_at?:string; sent_by?:string }
export type LiveParticipant = { id:string; user_id:string; event_id:string; display_name:string; last_seen_at:string; started_at:string; submitted_at?:string; answers:Record<string,string>; section_scores:number[]; total_score:number; feedback?:ParticipantFeedback }
const EVENT_KEY='nutrition_live_event'
const participantKey=(userId:string)=>`nutrition_participant_${userId}`
async function read<T>(key:string):Promise<T|null>{const {data,error}=await supabaseAdmin.from('app_config').select('value').eq('key',key).maybeSingle();if(error)throw error;if(!data?.value)return null;return (typeof data.value==='string'?JSON.parse(data.value):data.value) as T}
async function write(key:string,value:unknown){const {error}=await supabaseAdmin.from('app_config').upsert({key,value:JSON.stringify(value)},{onConflict:'key'});if(error)throw error}
export const getLiveEvent=()=>read<LiveEvent>(EVENT_KEY)
export const saveLiveEvent=(event:LiveEvent)=>write(EVENT_KEY,event)
export const getLiveParticipant=(userId:string)=>read<LiveParticipant>(participantKey(userId))
export const saveLiveParticipant=(participant:LiveParticipant)=>write(participantKey(participant.user_id),participant)
export async function listLiveParticipants(){const {data,error}=await supabaseAdmin.from('app_config').select('value').like('key','nutrition_participant_%');if(error)throw error;return(data||[]).map((row:any)=>typeof row.value==='string'?JSON.parse(row.value):row.value) as LiveParticipant[]}
