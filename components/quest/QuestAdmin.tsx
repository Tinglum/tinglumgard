'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'

type EventRow = { id: string; name: string; join_code_label: string; status: 'active' | 'paused' | 'ended'; released_section: number; results_released: boolean }
type ParticipantRow = { id: string; display_name: string; answered_count: number; current_question: number; earned_points: number; section_scores: number[]; last_seen_at: string; submitted_at?: string }
type Dashboard = { events: EventRow[]; activeEvent: EventRow | null; participants: ParticipantRow[]; aggregates: Array<{ section: number; average: number; responses: number }> }

export function QuestAdmin() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const response = await fetch('/api/quest/admin', { cache: 'no-store' })
    if (response.status === 401) { setError('Sign in with a Tinglum administrator account to open this page.'); return }
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Could not load the session')
    setData(payload)
    setError('')
  }, [])
  useEffect(() => { load().catch((e) => setError(e.message)); const id = setInterval(() => load().catch(() => undefined), 4000); return () => clearInterval(id) }, [load])

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!data?.activeEvent && action !== 'create') return
    setBusy(true)
    try {
      const response = await fetch('/api/quest/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, eventId: data?.activeEvent?.id, ...extra }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Action failed')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed') } finally { setBusy(false) }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await act('create', { name: form.get('name'), joinCode: form.get('joinCode') })
    event.currentTarget.reset()
  }

  const active = data?.activeEvent
  return <main className="min-h-screen bg-[#f3f0e8] text-[#17251d]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Fitpreneur · live room</p><h1 className="text-3xl font-medium sm:text-5xl">Nutrition Fitness admin</h1></div>
        {active && <div className="rounded-2xl bg-white px-5 py-3 shadow-sm"><span className="text-xs uppercase tracking-wider text-neutral-500">Join code</span><strong className="ml-3 text-xl tracking-[.16em]">{active.join_code_label}</strong></div>}
      </div>
      {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {!active ? <form onSubmit={createEvent} className="max-w-lg rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-2xl font-medium">Create the live session</h2>
        <label className="mb-4 block text-sm font-medium">Event name<input name="name" required defaultValue="Fitpreneur Nutrition Lunch" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3" /></label>
        <label className="mb-5 block text-sm font-medium">Join code<input name="joinCode" required defaultValue="FIT2026" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 uppercase" /></label>
        <button disabled={busy} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-50">Create session</button>
      </form> : <>
        <section className="mb-7 grid gap-4 sm:grid-cols-4">
          {[['Participants', data?.participants.length || 0], ['Released', `${active.released_section} / 5`], ['Status', active.status], ['Results', active.results_released ? 'Released' : 'Hidden']].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p><p className="mt-2 text-2xl font-medium capitalize">{value}</p></div>)}
        </section>
        <div className="mb-7 flex flex-wrap gap-3">
          <button disabled={busy || active.released_section >= 5 || active.status !== 'active'} onClick={() => act('release-next')} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">Release section {Math.min(5, active.released_section + 1)}</button>
          {active.status === 'paused' ? <button disabled={busy} onClick={() => act('status', { status: 'active' })} className="rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium">Resume</button> : <button disabled={busy || active.status === 'ended'} onClick={() => act('status', { status: 'paused' })} className="rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium">Pause</button>}
          <button disabled={busy || active.released_section < 5 || active.results_released} onClick={() => act('release-results')} className="rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium disabled:opacity-40">Release results</button>
          <button disabled={busy || active.status === 'ended'} onClick={() => act('status', { status: 'ended' })} className="rounded-xl border border-red-300 bg-white px-5 py-3 font-medium text-red-800 disabled:opacity-40">End session</button>
        </div>
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4"><h2 className="text-xl font-medium">Participant progress</h2><p className="text-sm text-neutral-500">Earned points reflect answered questions only—not a projected final result.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr>{['Participant','Progress','Current','Section scores','Earned','Last seen'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{data?.participants.map((p) => <tr key={p.id} className="border-t border-neutral-100"><td className="px-5 py-4"><strong className="font-medium">{p.display_name}</strong><span className="block text-xs text-neutral-400">{p.id.slice(0,8)}</span></td><td className="px-5 py-4">{p.answered_count} / 25</td><td className="px-5 py-4">Q{Math.min(25, p.current_question || 1)}</td><td className="px-5 py-4">{(p.section_scores || [0,0,0,0,0]).map((s,i) => <span key={i} className="mr-2 inline-block">{s}/20</span>)}</td><td className="px-5 py-4 font-medium">{p.earned_points} pts</td><td className="px-5 py-4 text-sm text-neutral-500">{new Date(p.last_seen_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td></tr>)}</tbody></table></div>
          {!data?.participants.length && <p className="p-8 text-center text-neutral-500">Waiting for participants to join.</p>}
        </section>
      </>}
    </div>
  </main>
}
