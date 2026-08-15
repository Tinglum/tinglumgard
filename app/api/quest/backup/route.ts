import { NextRequest } from 'next/server'
import { sendViaMailgun } from '@/lib/email/provider-mailgun'
import { supabaseAdmin } from '@/lib/supabase/server'
import { questError, requireQuestUser } from '@/lib/quest/server'
import { getLiveParticipant } from '@/lib/quest/live-store'

export async function POST(request: NextRequest) {
  try {
    const user = await requireQuestUser(request)
    const body = await request.json()
    const attemptId = String(body.attemptId || '').slice(0, 80)
    const answers = body.answers && typeof body.answers === 'object' ? body.answers as Record<string,string> : {}
    const validAnswers = Object.fromEntries(Object.entries(answers).filter(([question,answer]) => /^Q(?:[1-9]|1\d|2[0-5])$/.test(question) && /^[A-E]$/.test(String(answer))))
    if (!attemptId || Object.keys(validAnswers).length !== 25) return Response.json({ error:'Complete recovery data is required' }, { status:400 })
    const participant = await getLiveParticipant(user.id)
    if (!participant || participant.id !== attemptId) return Response.json({error:'Participant record not found'},{status:403})
    const displayName = participant.display_name
    const backupKey = `nutrition_backup_${user.id}_${attemptId}`
    const { data: previous } = await supabaseAdmin.from('app_config').select('value').eq('key',backupKey).maybeSingle()
    const signature = JSON.stringify(validAnswers)
    if (previous?.value === signature || previous?.value === JSON.stringify(signature)) return Response.json({ success:true, duplicate:true })
    const recipient = process.env.QUEST_RECOVERY_EMAIL || process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM
    if (!recipient) throw new Error('Recovery mailbox is not configured')
    const payload = { assessmentVersion:'v1.0', participantId:user.id, attemptId, email:user.email || null, displayName, answers:validAnswers, capturedAt:new Date().toISOString() }
    const sent = await sendViaMailgun({
      to: recipient,
      subject: `Nutrition assessment recovery — ${displayName || user.email || user.id}`,
      text: `A participant used offline completion. Recovery data follows.\n\n${JSON.stringify(payload,null,2)}`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Nutrition assessment recovery</h2><p><strong>Participant:</strong> ${escapeHtml(displayName || 'Unknown')}<br><strong>Email:</strong> ${escapeHtml(user.email || 'Unknown')}<br><strong>Attempt:</strong> ${escapeHtml(attemptId)}</p><pre style="white-space:pre-wrap;background:#f3f3f3;padding:16px">${escapeHtml(JSON.stringify(payload,null,2))}</pre></div>`,
    })
    if (!sent.success) throw new Error(sent.error || 'Recovery email failed')
    await supabaseAdmin.from('app_config').upsert({key:backupKey,value:signature},{onConflict:'key'})
    return Response.json({success:true})
  } catch (error) { return questError(error) }
}

function escapeHtml(value:string){return value.replace(/[&<>"']/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]||character))}
