'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'
import { SessionPicker } from '@/components/quest/admin/SessionPicker'
import { QuestionBreakdown, type ParticipantRow } from '@/components/quest/admin/QuestionBreakdown'
import { StuckList } from '@/components/quest/admin/StuckList'
import { ChallengePanel } from '@/components/quest/admin/ChallengePanel'
import { ExportAndBroadcast } from '@/components/quest/admin/ExportAndBroadcast'
import { ParticipantActions } from '@/components/quest/admin/ParticipantActions'

type EventRow = { id: string; name: string; join_code_label: string; status: 'active' | 'paused' | 'ended'; released_section: number; results_released: boolean }
type AutoRelease = { enabled: boolean; minutes: number; nextAt?: string }
type Template = { id: string; name: string; join_code_label: string; created_at: string }
type Row = ParticipantRow & { user_id?: string }
type Dashboard = {
  events: EventRow[]; activeEvent: EventRow | null; participants: Row[]
  aggregates: Array<{ section: number; average: number; responses: number; participants: number }>
  answerDistribution: Array<{ answer: string; score: number; count: number; percent: number }>
  totalAnswers: number; releasedDistribution: number[]; autoRelease: AutoRelease | null
  templates: Template[]; isArchivedView: boolean
}

const sectionNames = ['Fuel & macros', 'Adaptability', 'Nutrient coverage', 'Feedback & recovery', 'Longevity']
const TABS = ['Live', 'Questions', 'Participants', 'Challenge', 'Export & email', 'Sessions'] as const
type Tab = typeof TABS[number]

const CARD = 'rounded-3xl bg-white p-5 shadow-sm sm:p-7'
const LABEL = 'text-xs font-semibold uppercase tracking-[.16em] text-emerald-800'

export function QuestAdmin() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('Live')
  const [viewEventId, setViewEventId] = useState<string | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState('')

  const load = useCallback(async () => {
    const query = viewEventId ? `?eventId=${encodeURIComponent(viewEventId)}` : ''
    const response = await fetch(`/api/quest/admin${query}`, { cache: 'no-store' })
    if (response.status === 401) { setError('Sign in with a Tinglum administrator account to open this page.'); return }
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Could not load the session')
    setData(payload)
    setError('')
  }, [viewEventId])

  useEffect(() => {
    load().catch((e) => setError(e.message))
    const id = setInterval(() => load().catch(() => undefined), 4000)
    return () => clearInterval(id)
  }, [load])

  const act = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true)
    try {
      const response = await fetch('/api/quest/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Action failed')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed') } finally { setBusy(false) }
  }, [load])

  const active = data?.activeEvent
  const auto = data?.autoRelease
  const live = !data?.isArchivedView
  const released = active?.released_section ?? 0

  // Auto-release only fires while this panel is open, so a session cannot
  // advance through parts when the facilitator is not actually running it.
  useEffect(() => {
    if (!live || busy) return
    if (!auto?.enabled || !auto.nextAt) return
    if (!active || active.status !== 'active' || active.released_section >= 5) return
    if (new Date(auto.nextAt).getTime() > Date.now()) return
    act('release-next')
  }, [auto?.enabled, auto?.nextAt, active, busy, live, act])

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    await act('create', { name: form.get('name'), joinCode: form.get('joinCode') })
    target.reset()
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    await act('save-template', { name: form.get('tname'), joinCode: form.get('tcode') })
    target.reset()
  }

  async function saveFeedback(sendEmail: boolean) {
    if (!selectedParticipant || !feedbackDraft.trim()) return
    setBusy(true)
    try {
      const response = await fetch('/api/quest/admin/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ participantId: selectedParticipant, message: feedbackDraft, sendEmail }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not save feedback')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save feedback') } finally { setBusy(false) }
  }

  function confirmEnd() {
    const unfinished = (data?.participants || []).filter((p) => !p.submitted_at).length
    const warning = `${unfinished} ${unfinished === 1 ? 'person has' : 'people have'} not submitted yet. Ending the session stops them submitting at all. End it anyway?`
    if (unfinished && !window.confirm(warning)) return
    act('status', { status: 'ended' })
  }

  const selected = data?.participants.find((participant) => participant.id === selectedParticipant)

  return <main className="min-h-screen bg-[#f3f0e8] text-[#17251d]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className={`mb-2 ${LABEL}`}>Fitpreneur · live room</p>
          <h1 className="text-3xl font-medium sm:text-5xl">Nutrition Fitness admin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/quest/present" target="_blank" rel="noreferrer" className="rounded-xl border border-[#173f2b] bg-white px-4 py-2 text-sm font-medium text-[#173f2b]">Presenter view</a>
          {active && <div className="rounded-2xl bg-white px-5 py-3 shadow-sm"><span className="text-xs uppercase tracking-wider text-neutral-500">Join code</span><strong className="ml-3 text-xl tracking-[.16em]">{active.join_code_label}</strong></div>}
        </div>
      </div>

      {data?.isArchivedView && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900">
        <span>Viewing an archived session. Controls are hidden and nothing here can be changed.</span>
        <button type="button" onClick={() => { setViewEventId(null); setSelectedParticipant(null) }} className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-medium">Back to current session</button>
      </div>}

      {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Admin sections">
        {TABS.map((name) => <button key={name} type="button" onClick={() => setTab(name)} aria-current={tab === name ? 'page' : undefined}
          className={`rounded-full px-4 py-2 text-sm font-medium ${tab === name ? 'bg-[#173f2b] text-white' : 'border border-neutral-300 bg-white hover:border-neutral-400'}`}>{name}</button>)}
      </nav>

      {tab === 'Sessions' && <SessionPicker selectedId={viewEventId} onSelect={(id) => { setViewEventId(id); setSelectedParticipant(null); setTab('Live') }} />}

      {tab === 'Live' && <>
        {(!active || active.status === 'ended') && live && <form onSubmit={createEvent} className={`mb-6 max-w-lg ${CARD}`}>
          <h2 className="mb-5 text-2xl font-medium">{active ? 'Start a new session' : 'Create the live session'}</h2>
          {active && <p className="mb-4 -mt-2 text-sm text-neutral-500">The session below has ended and stays here for review. Starting a new one begins a fresh dashboard and join code.</p>}
          <label className="mb-4 block text-sm font-medium">Event name<input name="name" required defaultValue="Fitpreneur Nutrition Lunch" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3" /></label>
          <label className="mb-5 block text-sm font-medium">Join code<input name="joinCode" required defaultValue="FIT2026" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 uppercase" /></label>
          <button disabled={busy} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-50">{active ? 'Create new session' : 'Create session'}</button>
          {!!data?.templates?.length && <div className="mt-6 border-t border-neutral-200 pt-4">
            <p className={LABEL}>Saved templates</p>
            <ul className="mt-3 space-y-2">{data.templates.map((template) => <li key={template.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
              <span className="min-w-0"><strong className="block truncate text-sm font-medium">{template.name}</strong><span className="text-xs tracking-[.14em] text-neutral-500">{template.join_code_label}</span></span>
              <span className="flex shrink-0 gap-2">
                <button type="button" disabled={busy} onClick={() => act('create', { name: template.name, joinCode: template.join_code_label })} className="rounded-lg bg-[#173f2b] px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Use</button>
                <button type="button" disabled={busy} onClick={() => act('delete-template', { templateId: template.id })} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-800 disabled:opacity-40">Delete</button>
              </span>
            </li>)}</ul>
          </div>}
        </form>}

        {active && <>
          <section className="mb-6 grid gap-4 sm:grid-cols-4">
            {([['Participants', data?.participants.length || 0], ['Released', `${released} / 5`], ['Status', active.status], ['Results', active.results_released ? 'Released' : 'Hidden']] as Array<[string, string | number]>).map(([name, value]) =>
              <div key={name} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wider text-neutral-500">{name}</p><p className="mt-2 text-2xl font-medium capitalize">{value}</p></div>)}
          </section>

          {live && <>
            <div className="mb-6 flex flex-wrap gap-3">
              {released === 0
                ? <button type="button" disabled={busy} onClick={() => act('start-first')} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">Start Part 1</button>
                : <button type="button" disabled={busy || released >= 5 || active.status !== 'active'} onClick={() => act('release-next')} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">Release part {Math.min(5, released + 1)}</button>}
              {active.status === 'paused'
                ? <button type="button" disabled={busy} onClick={() => act('status', { status: 'active' })} className="rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium">Resume</button>
                : <button type="button" disabled={busy || active.status === 'ended'} onClick={() => act('status', { status: 'paused' })} className="rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium">Pause</button>}
              <button type="button" disabled={busy || released < 5 || active.results_released} onClick={() => act('release-results')} className="rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium disabled:opacity-40">Release results</button>
              <button type="button" disabled={busy || active.status === 'ended'} onClick={confirmEnd} className="rounded-xl border border-red-300 bg-white px-5 py-3 font-medium text-red-800 disabled:opacity-40">End session</button>
            </div>

            <section className={`mb-6 ${CARD}`}>
              <p className={LABEL}>Show the room how it answered</p>
              <p className="mt-2 text-sm text-neutral-500">Puts the answer spread for a part on every participant&apos;s own screen while they wait between parts. Counts only, no names, and nobody sees an individual answer.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((section) => {
                  const shown = (data?.releasedDistribution || []).includes(section)
                  return <button key={section} type="button" disabled={busy || section > released} onClick={() => act(shown ? 'hide-distribution' : 'release-distribution', { section })}
                    className={`rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-30 ${shown ? 'bg-[#173f2b] text-white' : 'border border-neutral-300 bg-white'}`}>
                    Part {section}{shown ? ' · showing' : ''}
                  </button>
                })}
              </div>
            </section>

            <section className={`mb-6 ${CARD}`}>
              <p className={LABEL}>Auto-release</p>
              <p className="mt-2 text-sm text-neutral-500">Opens the next part on a timer while this page stays open. Close the panel and it stops.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label htmlFor="auto-minutes" className="text-sm font-medium">Minutes per part</label>
                <input id="auto-minutes" type="number" min={1} max={120} defaultValue={auto?.minutes ?? 10} className="w-24 rounded-xl border border-neutral-300 px-3 py-2" />
                <button type="button" disabled={busy} onClick={() => {
                  const field = document.getElementById('auto-minutes') as HTMLInputElement | null
                  act('set-auto-release', { enabled: !auto?.enabled, minutes: Number(field?.value || 10) })
                }} className={`rounded-xl px-4 py-2 text-sm font-medium ${auto?.enabled ? 'bg-[#173f2b] text-white' : 'border border-neutral-300 bg-white'}`}>{auto?.enabled ? 'On, turn off' : 'Turn on'}</button>
                {auto?.enabled && auto.nextAt && <span className="text-sm text-neutral-500">Next part at {new Date(auto.nextAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            </section>

            <form onSubmit={saveTemplate} className={`mb-6 ${CARD}`}>
              <p className={LABEL}>Save this setup as a template</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <input name="tname" required aria-label="Template name" placeholder="Template name" defaultValue={active.name} className="min-w-[200px] flex-1 rounded-xl border border-neutral-300 px-4 py-2" />
                <input name="tcode" required aria-label="Template join code" placeholder="Join code" defaultValue={active.join_code_label} className="w-40 rounded-xl border border-neutral-300 px-4 py-2 uppercase" />
                <button disabled={busy} className="rounded-xl border border-[#173f2b] bg-white px-4 py-2 text-sm font-medium text-[#173f2b] disabled:opacity-40">Save template</button>
              </div>
            </form>
          </>}

          <section className={`mb-6 ${CARD}`} aria-labelledby="collective-results-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div><h2 id="collective-results-heading" className="text-xl font-medium">How the group answered</h2><p className="mt-1 text-sm text-neutral-500">Anonymous cohort view, no individual names are shown in these results.</p></div>
              <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900">{data?.totalAnswers || 0} answers recorded</p>
            </div>
            <div className="grid gap-7 lg:grid-cols-[1.35fr_.65fr]">
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Average by section</h3>
                <div className="space-y-4">{(data?.aggregates || []).map((aggregate) => <div key={aggregate.section}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-medium">{aggregate.section}. {sectionNames[aggregate.section - 1]}</span><span className="whitespace-nowrap text-sm"><strong>{aggregate.average}</strong> / 20</span></div>
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`${sectionNames[aggregate.section - 1]} group average ${aggregate.average} out of 20`}><div className="h-full rounded-full bg-[#2f7551] transition-[width] duration-500" style={{ width: `${aggregate.average / 20 * 100}%` }} /></div>
                  <p className="mt-1 text-xs text-neutral-400">{aggregate.responses} answers from {aggregate.participants} participant{aggregate.participants === 1 ? '' : 's'}</p>
                </div>)}</div>
              </div>
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Answer distribution</h3>
                <div className="flex h-48 items-end gap-2 border-b border-neutral-200 pb-1">{(data?.answerDistribution || []).map((item) => <div key={item.answer} className="flex h-full flex-1 flex-col justify-end text-center">
                  <span className="mb-1 text-xs font-medium text-neutral-600">{item.percent}%</span><div className="mx-auto w-full max-w-12 rounded-t-lg bg-emerald-700/80 transition-[height] duration-500" style={{ height: `${Math.max(item.percent, item.count ? 4 : 0)}%` }} title={`${item.count} chose ${item.answer}`} /><span className="mt-2 text-sm font-semibold">{item.answer}</span><span className="text-[11px] text-neutral-400">{item.count}</span>
                </div>)}</div>
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">A is the lowest-scoring response and E is the highest. This chart combines every recorded question response.</p>
              </div>
            </div>
          </section>

          {live && <StuckList participants={data?.participants || []} releasedSection={released} />}
        </>}
      </>}

      {tab === 'Questions' && <QuestionBreakdown participants={data?.participants || []} />}
      {tab === 'Challenge' && <ChallengePanel eventId={viewEventId} />}
      {tab === 'Export & email' && <ExportAndBroadcast eventId={viewEventId} />}

      {tab === 'Participants' && <>
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4"><h2 className="text-xl font-medium">Participant progress</h2><p className="text-sm text-neutral-500">Earned points reflect answered questions only, not a projected final result.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr>{['Participant', 'Progress', 'Current', 'Section scores', 'Earned', 'Challenge', 'Last seen', 'Review'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{data?.participants.map((p) => <tr key={p.id} className="border-t border-neutral-100">
            <td className="px-5 py-4"><strong className="font-medium">{p.display_name}</strong><span className="block text-xs text-neutral-400">{p.email || p.id.slice(0, 8)}</span></td>
            <td className="px-5 py-4">{p.answered_count} / 25{p.submitted_at && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900">submitted</span>}</td>
            <td className="px-5 py-4">Q{Math.min(25, p.current_question || 1)}</td>
            <td className="px-5 py-4">{(p.section_scores || [0, 0, 0, 0, 0]).map((s, i) => <span key={i} className="mr-2 inline-block">{s}/20</span>)}</td>
            <td className="px-5 py-4 font-medium">{p.earned_points} pts</td>
            <td className="px-5 py-4 text-sm">{p.fasting_challenge?.opted_in ? <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium capitalize text-emerald-900">{p.fasting_challenge.track}</span> : <span className="text-neutral-400">Not joined</span>}</td>
            <td className="px-5 py-4 text-sm text-neutral-500">{new Date(p.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td className="px-5 py-4"><button type="button" onClick={() => { setSelectedParticipant(p.id); setFeedbackDraft(p.feedback?.message || '') }} className="rounded-lg border border-[#173f2b] px-3 py-2 text-sm font-medium text-[#173f2b]">Answers and feedback</button></td>
          </tr>)}</tbody></table></div>
          {!data?.participants.length && <p className="p-8 text-center text-neutral-500">Waiting for participants to join.</p>}
        </section>

        {selected && <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-8" aria-labelledby="participant-review-heading">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><p className={LABEL}>Private participant review</p><h2 id="participant-review-heading" className="mt-2 text-3xl font-medium">{selected.display_name}</h2><p className="mt-1 text-sm text-neutral-500">{selected.email}</p></div>
            <button type="button" onClick={() => setSelectedParticipant(null)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">Close</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">{QUEST_ASSESSMENT.questions.map((question) => {
            const answerKey = selected.answers?.[question.id]
            const choice = question.choices.find((item) => item.id === answerKey)
            return <article key={question.id} className="rounded-2xl border border-neutral-200 p-4"><p className="text-xs font-semibold text-emerald-800">Q{question.order} · {answerKey || 'Not answered'}</p><p className="mt-2 text-sm font-medium">{question.prompt.en}</p>{choice && <p className="mt-2 text-sm text-neutral-600">{choice.text.en}</p>}</article>
          })}</div>

          {live && selected.user_id && <div className="mt-7 border-t border-neutral-200 pt-6">
            <ParticipantActions userId={selected.user_id} eventId={viewEventId} displayName={selected.display_name} submittedAt={selected.submitted_at} answers={selected.answers} onChanged={() => { load().catch(() => undefined) }} />
          </div>}

          <div className="mt-7 border-t border-neutral-200 pt-6">
            <label className="block font-medium" htmlFor="feedback-draft">Direct feedback</label>
            <textarea id="feedback-draft" value={feedbackDraft} onChange={(event) => setFeedbackDraft(event.target.value)} rows={7} maxLength={5000} placeholder="Write a thoughtful, personal response to this assessment." className="mt-2 w-full rounded-xl border border-neutral-300 p-4 font-normal" />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" disabled={busy || !feedbackDraft.trim()} onClick={() => saveFeedback(false)} className="rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium text-[#173f2b] disabled:opacity-40">Save privately</button>
              <button type="button" disabled={busy || !feedbackDraft.trim() || !selected.email} onClick={() => saveFeedback(true)} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">Save and email participant</button>
              {selected.feedback?.sent_at && <span className="self-center text-sm text-neutral-500">Last emailed {new Date(selected.feedback.sent_at).toLocaleString()}</span>}
            </div>
          </div>
        </section>}
      </>}
    </div>
  </main>
}
