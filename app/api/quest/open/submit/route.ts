import { NextRequest } from 'next/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'
import { FASTING_BOOKING_URL } from '@/lib/quest/fasting-content'
import { challengeStillOpen, getOpenResponse, isValidToken, saveOpenResponse, scoreAnswers } from '@/lib/quest/open-store'

const ALL_IDS = Array.from({ length: 25 }, (_, i) => `Q${i + 1}`)
const SECTIONS = ['Fuel & Macro Fitness', 'Nutrition Adaptability', 'Nutrient Coverage & Internal Health', 'Feedback, Recovery & Individualization', 'Longevity & Healthspan']
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))

function resultsHtml(name: string, total: number, sections: number[], bookingUrl: string) {
  const rows = sections.map((score, i) =>
    `<tr><td style="padding:6px 0;color:#374151">${escapeHtml(SECTIONS[i])}</td><td style="padding:6px 0;text-align:right;font-weight:600">${score} / 20</td></tr>`
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,Arial,sans-serif;line-height:1.6;color:#111827">
<div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
<p style="letter-spacing:.18em;font-size:12px;font-weight:700;margin:0 0 8px">FITPRENEUR</p>
<div style="font-size:20px;font-weight:700;margin-bottom:10px">Your Nutrition Fitness Score</div>
<p>Hi ${escapeHtml(name || 'there')},</p>
<div style="font-size:34px;font-weight:700;margin:14px 0">${total} <span style="font-size:16px;color:#6b7280">/ 100</span></div>
<table style="width:100%;border-collapse:collapse;margin:12px 0 18px">${rows}</table>
<p style="color:#6b7280;font-size:14px">This reflects the fitness of your nutrition decision-making. It is a reflection based on your answers, not a diagnosis or individual medical advice.</p>
<p style="margin:24px 0 0"><a href="${bookingUrl}" style="background:#173f2b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:600">Book a conversation with Kenneth</a></p>
</div></div></body></html>`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token
    if (!isValidToken(token)) return Response.json({ error: 'Invalid session' }, { status: 400 })

    const response = await getOpenResponse(token)
    if (!response) return Response.json({ error: 'No assessment found for this session.' }, { status: 404 })

    const missing = ALL_IDS.filter((id) => !response.answers?.[id])
    if (missing.length) {
      return Response.json({ error: `Still to answer: ${missing.join(', ')}` }, { status: 400 })
    }

    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim().slice(0, 80)
    if (email && !email.includes('@')) return Response.json({ error: 'That email address does not look right.' }, { status: 400 })

    const { section_scores, total_score } = scoreAnswers(response.answers)
    response.section_scores = section_scores
    response.total_score = total_score
    // Keep the first submission time if this is a repeat call, so a double tap
    // cannot make it look like a fresh completion.
    response.submitted_at = response.submitted_at || new Date().toISOString()
    response.updated_at = new Date().toISOString()
    if (email) response.email = email
    if (name) response.display_name = name
    await saveOpenResponse(response)

    const bookingUrl = FASTING_BOOKING_URL
    // Email failures must not cost someone their results, so both sends are
    // wrapped and the response is returned either way.
    if (email) {
      try {
        await dispatchEmail({
          to: email,
          subject: `Your Nutrition Fitness Score: ${total_score}/100`,
          html: resultsHtml(name, total_score, section_scores, bookingUrl),
          classification: 'transactional',
          locale: 'en',
          sourcePath: 'api.quest.open.submit',
          templateKey: 'quest.open.results',
          sendImmediately: true,
          idempotency: { source: 'api.quest.open.submit', entity: 'quest_open', id: token, template: 'quest.open.results' },
        })
      } catch (mailError) {
        console.error('quest-open-results-email', mailError)
      }
    }

    const notify = process.env.QUEST_NOTIFY_EMAIL || process.env.EMAIL_FROM
    if (notify) {
      try {
        await dispatchEmail({
          to: notify,
          subject: `Nutrition Fitness completed — ${name || 'anonymous'} scored ${total_score}/100`,
          html: `<p><strong>${escapeHtml(name || 'Anonymous')}</strong> finished the open assessment.</p>
<p>Score <strong>${total_score}/100</strong><br>Sections: ${section_scores.join(' / ')}<br>Email: ${escapeHtml(email || 'not given')}</p>`,
          classification: 'system',
          locale: 'en',
          sourcePath: 'api.quest.open.submit',
          templateKey: 'quest.open.notify',
          sendImmediately: true,
          idempotency: { source: 'api.quest.open.notify', entity: 'quest_open', id: token, template: 'quest.open.notify' },
        })
      } catch (notifyError) {
        console.error('quest-open-notify', notifyError)
      }
    }

    return Response.json({
      result: {
        total_score,
        section_scores,
        submitted_at: response.submitted_at,
        answers: response.answers,
      },
      sections: QUEST_ASSESSMENT.sections.map((s) => ({ id: s.id, order: s.order, title: s.title })),
      challengeOpen: challengeStillOpen(),
      bookingUrl,
    })
  } catch (error) {
    console.error('quest-open-submit', error)
    return Response.json({ error: 'Could not complete your assessment.' }, { status: 500 })
  }
}
