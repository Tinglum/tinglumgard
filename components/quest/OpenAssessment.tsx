'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'

// The token is what ties an unfinished run to this browser. It lives in both a
// cookie and localStorage because each survives cases the other does not, and
// answers are cached locally as well as sent, so a dropped connection or a
// reload never costs someone their progress.
const TOKEN_KEY = 'nutrition-open-token'
const CACHE_KEY = 'nutrition-open-answers'

function readCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const hit = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : ''
}
function writeCookie(name: string, value: string) {
  // A year is long enough to be useful and short enough not to linger forever.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`
}
function ensureToken() {
  const existing = localStorage.getItem(TOKEN_KEY) || readCookie(TOKEN_KEY)
  if (existing && /^[a-zA-Z0-9_-]{16,64}$/.test(existing)) {
    localStorage.setItem(TOKEN_KEY, existing)
    writeCookie(TOKEN_KEY, existing)
    return existing
  }
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)
  localStorage.setItem(TOKEN_KEY, token)
  writeCookie(TOKEN_KEY, token)
  return token
}

type Result = { total_score: number; section_scores: number[]; answers: Record<string, string> }

const CARD = 'rounded-[2rem] bg-white p-6 shadow-sm sm:p-10'
const LABEL = 'text-xs font-semibold uppercase tracking-[.2em] text-emerald-800'

export function OpenAssessment() {
  const questions = QUEST_ASSESSMENT.questions
  const [token, setToken] = useState('')
  const [stage, setStage] = useState<'loading' | 'intro' | 'section' | 'questions' | 'capture' | 'results'>('loading')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [sectionCard, setSectionCard] = useState(1)
  const [result, setResult] = useState<Result | null>(null)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [bookingUrl, setBookingUrl] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [openWhy, setOpenWhy] = useState<string | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const t = ensureToken()
    setToken(t)
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) { try { setAnswers(JSON.parse(cached)) } catch { /* ignore bad cache */ } }
    fetch(`/api/quest/open/state?token=${encodeURIComponent(t)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((payload) => {
        if (payload?.state) {
          const server = payload.state.answers || {}
          // The server is authoritative for anything it already has; the local
          // cache fills in answers that never made it out.
          setAnswers((local) => ({ ...local, ...server }))
          setChallengeOpen(Boolean(payload.challengeOpen))
          if (payload.state.submitted_at) {
            setResult({ total_score: payload.state.total_score, section_scores: payload.state.section_scores, answers: server })
            setStage('results')
            return
          }
          const answered = Object.keys({ ...JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'), ...server })
          setIndex(Math.min(questions.length - 1, answered.length))
          setStage(answered.length ? 'questions' : 'intro')
          return
        }
        setStage('intro')
      })
      .catch(() => setStage('intro'))
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }
  }, [questions.length])

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [index, stage, sectionCard])

  const current = questions[index]
  const answeredCount = Object.keys(answers).length

  const choose = useCallback(async (questionId: string, answerKey: string) => {
    const wasUnanswered = !answers[questionId]
    const next = { ...answers, [questionId]: answerKey }
    setAnswers(next)
    localStorage.setItem(CACHE_KEY, JSON.stringify(next))
    setMessage('')
    // Fire and forget: the local cache already holds it, so a failed request
    // is recovered on the next save or at submit time.
    fetch('/api/quest/open/answer', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, questionId, answerKey }),
    }).catch(() => undefined)

    if (!wasUnanswered) return
    const order = questions.findIndex((q) => q.id === questionId)
    if (order >= questions.length - 1) return
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      const nextOrder = order + 1
      // A short marker between parts gives the run some shape without making
      // anyone wait for a facilitator.
      if (nextOrder % 5 === 0) { setSectionCard(nextOrder / 5 + 1); setStage('section') }
      setIndex(nextOrder)
    }, 160)
  }, [answers, questions, token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true); setMessage('')
    try {
      // Push anything the server may have missed before asking it to score.
      const unsynced = questions.filter((q) => answers[q.id])
      await Promise.allSettled(unsynced.map((q) => fetch('/api/quest/open/answer', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, questionId: q.id, answerKey: answers[q.id] }),
      })))
      const response = await fetch('/api/quest/open/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, email: form.get('email'), name: form.get('name') }),
      })
      const payload = await response.json()
      if (!response.ok) { setMessage(payload.error || 'Could not complete your assessment.'); return }
      setResult(payload.result)
      setChallengeOpen(Boolean(payload.challengeOpen))
      setBookingUrl(payload.bookingUrl || '')
      localStorage.removeItem(CACHE_KEY)
      setStage('results')
    } catch { setMessage('Could not reach the server. Your answers are saved on this device.') }
    finally { setBusy(false) }
  }

  const shell = (body: React.ReactNode) => <main className="min-h-screen bg-[#f3f0e8] px-4 py-6 text-[#17251d] sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <p className="mb-6 text-xs font-semibold tracking-[.25em]">FITPRENEUR</p>
      {body}
    </div>
  </main>

  if (stage === 'loading') return shell(<p className="py-20 text-center">Loading…</p>)

  if (stage === 'intro') return shell(<section className={CARD}>
    <h1 className="mb-6 text-4xl font-medium sm:text-5xl">What is your Nutrition Fitness?</h1>
    <p className="mb-5 text-lg leading-relaxed">You have had your blood pressure taken. Probably your cholesterol too. Nobody has ever measured the thing that decides what you eat three times a day, every day, for the rest of your life.</p>
    <p className="mb-5 text-lg leading-relaxed">That is what this is.</p>
    <p className="mb-5 leading-relaxed text-neutral-700">It has nothing to do with what you weigh or how much nutrition you can recite. It measures how well you read your own body, how deliberately you fuel it, and how fast you adapt when something that worked stops working.</p>
    <p className="mb-8 leading-relaxed text-neutral-700">Almost nobody comes out even across the five areas. The gap is the interesting part.</p>
    <button type="button" onClick={() => setStage('questions')} className="w-full rounded-xl bg-[#173f2b] px-5 py-5 text-lg font-medium text-white">Find out — 25 questions, 10 minutes</button>
    <p className="mt-5 text-sm leading-relaxed text-neutral-500">Answer for how you have actually eaten these past 6–8 weeks, not how you mean to. Caught between two answers? Take the lower one — it makes your result worth having. Your progress saves as you go, so you can stop and come back.</p>
  </section>)

  if (stage === 'section') {
    const section = QUEST_ASSESSMENT.sections.find((s) => s.order === sectionCard)
    return shell(<section className={CARD}>
      <p className={LABEL}>Part {sectionCard} of 5</p>
      <h1 className="my-4 text-3xl font-medium sm:text-4xl">{section?.title.en}</h1>
      <p className="mb-8 text-neutral-600">{section?.description.en}</p>
      <button type="button" onClick={() => setStage('questions')} className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white">Continue</button>
    </section>)
  }

  if (stage === 'capture') return shell(<section className={CARD}>
    <p className={LABEL}>Almost done</p>
    <h1 className="my-4 text-3xl font-medium sm:text-4xl">Where should your results go?</h1>
    <p className="mb-6 text-neutral-600">Your score appears on the next screen either way. Leave an email if you would also like a copy you can come back to.</p>
    <form onSubmit={submit}>
      <label className="mb-4 block font-medium">Your name<input name="name" maxLength={80} autoComplete="name" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>
      <label className="mb-6 block font-medium">Email <span className="font-normal text-neutral-500">(optional)</span><input name="email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>
      <button disabled={busy} className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white disabled:opacity-50">{busy ? 'Scoring…' : 'See my results'}</button>
    </form>
    {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{message}</p>}
    <button type="button" onClick={() => setStage('questions')} className="mt-5 w-full text-sm font-medium underline underline-offset-4">Back to the questions</button>
  </section>)

  if (stage === 'results' && result) return shell(<>
    <section className={CARD}>
      <p className={LABEL}>Your Nutrition Fitness Score</p>
      <h1 className="my-4 text-6xl font-medium">{result.total_score} <span className="text-2xl text-neutral-400">/ 100</span></h1>
      <div className="my-8 space-y-4">
        {QUEST_ASSESSMENT.sections.map((section, i) => {
          const score = Number(result.section_scores?.[i] || 0)
          return <div key={section.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-medium">{section.title.en}</span><strong className="text-sm">{score} / 20</strong></div>
            <div className="h-3 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`${section.title.en}: ${score} out of 20`}>
              <div className="h-full rounded-full bg-[#3f7354]" style={{ width: `${score / 20 * 100}%` }} />
            </div>
          </div>
        })}
      </div>
      <p className="text-neutral-600">This reflects the fitness of your nutrition decision-making, not a diagnosis or a measurement of your health. The aim is not perfection — it is to show where your nutrition skills are already strong and where more awareness, consistency or adaptability would give you more options.</p>
      {bookingUrl && <a href={bookingUrl} target="_blank" rel="noreferrer" className="mt-7 block rounded-xl border border-[#173f2b] bg-white px-5 py-4 text-center font-medium text-[#173f2b]">Book a conversation with Kenneth</a>}
    </section>

    <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">
      <h2 className="mb-2 text-2xl font-medium">Your answers, question by question</h2>
      <p className="mb-6 text-sm text-neutral-500">Open any question to see what it was measuring and why it matters.</p>
      <div className="space-y-3">
        {questions.map((question) => {
          const key = result.answers?.[question.id]
          const choice = question.choices.find((c) => c.id === key)
          const isOpen = openWhy === question.id
          return <div key={question.id} className="overflow-hidden rounded-2xl border border-neutral-200">
            <button type="button" aria-expanded={isOpen} onClick={() => setOpenWhy(isOpen ? null : question.id)} className="w-full p-4 text-left hover:bg-[#f7faf5]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium">{question.order}. {question.prompt.en}</span>
                <span aria-hidden="true" className="shrink-0 text-lg">{isOpen ? '−' : '+'}</span>
              </div>
              <span className="mt-2 block text-sm text-neutral-500">{key ? `${key} · ${choice?.text.en}` : 'Not answered'}</span>
            </button>
            {isOpen && <div className="border-t border-neutral-200 bg-[#f7faf5] p-4 text-sm leading-relaxed text-neutral-700">
              {question.assesses && <p className="mb-3"><strong className="font-semibold">What this measures: </strong>{question.assesses.en}</p>}
              {question.why && <p>{question.why.en}</p>}
            </div>}
          </div>
        })}
      </div>
    </section>

    {challengeOpen && <section className="mt-6 rounded-[2rem] border border-[#c8d5c9] bg-[#eef3e9] p-6 sm:p-8">
      <p className={LABEL}>Toward the retreat · 22–24 September 2026</p>
      <h2 className="my-3 text-3xl font-medium">The fasting challenge</h2>
      <p className="leading-relaxed text-neutral-700">An optional group task about preparation, observation and sound decisions — not about pushing for the longest fast. It runs through September and ends at a shared dinner at the retreat.</p>
      <p className="mt-4 text-sm text-neutral-600">It is not suitable during pregnancy or breastfeeding, with a current or previous eating disorder, with diabetes or another condition needing managed food timing, or alongside medication taken with food. Talk to a qualified professional first if any of that applies.</p>
      {bookingUrl && <a href={bookingUrl} target="_blank" rel="noreferrer" className="mt-6 block rounded-xl bg-[#173f2b] px-5 py-4 text-center font-medium text-white">Ask Kenneth about joining</a>}
    </section>}
  </>)

  // questions
  const section = QUEST_ASSESSMENT.sections.find((s) => s.order === Math.ceil(current.order / 5))
  const allAnswered = questions.every((q) => answers[q.id])
  return shell(<>
    <div className="mb-5">
      <div className="mb-2 flex justify-between text-sm"><span>Part {section?.order} / 5</span><span>Question {current.order} of 25</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-[#d9ddd5]" role="progressbar" aria-valuemin={0} aria-valuemax={25} aria-valuenow={current.order}>
        <div className="h-full bg-[#3f7354] transition-all" style={{ width: `${current.order * 4}%` }} />
      </div>
    </div>
    <section key={current.id} className="quest-question-enter rounded-[2rem] bg-white p-5 shadow-sm sm:p-10">
      <p className="mb-4 text-sm font-medium uppercase tracking-[.14em] text-emerald-800">{section?.title.en}</p>
      <h1 className="mb-3 text-2xl font-medium sm:text-4xl">{current.prompt.en}</h1>
      {current.context && <p className="mb-5 text-neutral-500">{current.context.en}</p>}
      <fieldset className="space-y-3">
        <legend className="sr-only">Choose one answer</legend>
        {current.choices.map((choice) => <label key={`${current.id}-${choice.id}`} className={`flex min-h-[68px] cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${answers[current.id] === choice.id ? 'border-[#173f2b] bg-[#edf3e9] ring-2 ring-[#173f2b]' : 'border-neutral-200 bg-white/70 hover:border-neutral-400'}`}>
          <input type="radio" name={current.id} value={choice.id} checked={answers[current.id] === choice.id} onChange={() => choose(current.id, choice.id)} className="mt-1 h-5 w-5 accent-[#173f2b]" />
          <span><strong className="mr-2 font-medium">{choice.id}</strong>{choice.text.en}</span>
        </label>)}
      </fieldset>
      {message && <p className="mt-4 text-sm text-amber-800" role="status">{message}</p>}
      <div className="mt-7 flex flex-wrap items-center gap-3 sm:justify-between">
        <button type="button" disabled={index === 0} onClick={() => { if (advanceTimer.current) clearTimeout(advanceTimer.current); setIndex((i) => Math.max(0, i - 1)) }} className="rounded-xl border border-neutral-300 px-5 py-3 disabled:opacity-30">Previous</button>
        {index < questions.length - 1
          ? <button type="button" disabled={!answers[current.id]} onClick={() => { if (advanceTimer.current) clearTimeout(advanceTimer.current); setIndex((i) => i + 1) }} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">Next</button>
          : <button type="button" disabled={!allAnswered} onClick={() => setStage('capture')} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">Finish</button>}
      </div>
      {!allAnswered && index === questions.length - 1 && <p className="mt-4 text-sm text-amber-800">{25 - answeredCount} question{25 - answeredCount === 1 ? '' : 's'} still to answer.</p>}
    </section>
  </>)
}
