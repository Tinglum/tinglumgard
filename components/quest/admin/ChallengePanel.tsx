'use client'

// components/quest/admin/ChallengePanel.tsx — fasting-challenge management for
// the Nutrition Fitness admin, plus the reminder-email evidence trail.
//
// The warning banner is the point of the reminder half of this panel: a fast
// starting inside the reminder window with zero logged reminders means the
// cron is not firing, and that is invisible from anywhere else.

import { useCallback, useEffect, useState } from 'react'

type Track = 'standard' | 'advanced' | 'very_advanced'

type Enrollment = {
  user_id: string
  display_name: string
  email: string | null
  track: Track | null
  status: 'enrolled' | 'withdrawn' | 'completed'
  opted_in_at: string | null
  acknowledgments: {
    understands_not_medical_advice: boolean
    agrees_to_stop_if_unwell: boolean
    confirms_prior_experience: boolean
  }
}

type ScheduleItem = {
  track: Track
  index: number
  total: number
  startDate: string
  startLabel: string
  endLabel: string
  daysUntil: number
}

type ReminderLogEntry = {
  at: string
  user_id: string
  display_name: string
  email: string
  track: string
  occurrence: number
  tag: string
  startDate: string
  result: 'sent' | 'failed' | 'skipped'
  detail?: string
}

type ChallengeData = {
  enrollments: Enrollment[]
  byTrack: { standard: number; advanced: number; very_advanced: number; withdrawn: number }
  schedule: ScheduleItem[]
  reminders: ReminderLogEntry[]
  remindersByOccurrence: Record<string, { sent: number; failed: number; skipped: number }>
}

const TRACKS: Track[] = ['standard', 'advanced', 'very_advanced']
const TRACK_LABEL: Record<Track, string> = {
  standard: 'Standard',
  advanced: 'Advanced',
  very_advanced: 'Very advanced',
}
const TAG_LABEL: Record<string, string> = {
  prep: '3 days before',
  day_before: 'Day before',
  same_day: 'Same day',
}
const LABEL = 'text-xs font-semibold uppercase tracking-[.16em] text-emerald-800'

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const formatStamp = (value: string) => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Totals across every reminder tag for one occurrence. */
function occurrenceTotals(counts: ChallengeData['remindersByOccurrence'], item: ScheduleItem) {
  const totals = { sent: 0, failed: 0, skipped: 0 }
  for (const [key, value] of Object.entries(counts)) {
    const [track, index] = key.split(':')
    if (track !== item.track || Number(index) !== item.index) continue
    totals.sent += value.sent
    totals.failed += value.failed
    totals.skipped += value.skipped
  }
  return totals
}

export function ChallengePanel({ eventId }: { eventId: string | null }) {
  const [data, setData] = useState<ChallengeData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyUser, setBusyUser] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''
      const response = await fetch(`/api/quest/admin/challenge${query}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Could not load the fasting challenge')
      setData(payload as ChallengeData)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the fasting challenge')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void load() }, [load])

  const act = async (userId: string, action: 'set-track' | 'withdraw' | 'complete', track?: Track) => {
    if (action === 'withdraw' && !window.confirm('Withdraw this participant from the fasting challenge?')) return
    setBusyUser(userId)
    try {
      const response = await fetch('/api/quest/admin/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, eventId, action, track }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'That change did not save')
      setError('')
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'That change did not save')
    } finally {
      setBusyUser(null)
    }
  }

  // A fast inside the reminder window with nothing logged at all.
  const silentFasts = (data?.schedule || []).filter((item) => {
    if (item.daysUntil < 0 || item.daysUntil > 3) return false
    const totals = occurrenceTotals(data!.remindersByOccurrence, item)
    return totals.sent + totals.failed + totals.skipped === 0
  })

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7" aria-labelledby="challenge-panel-heading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={LABEL}>Fasting challenge</p>
          <h2 id="challenge-panel-heading" className="mt-2 text-2xl font-medium sm:text-3xl">Enrolment & reminders</h2>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-[#173f2b] bg-white px-4 py-2 text-sm font-medium text-[#173f2b] disabled:opacity-40">
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}

      {silentFasts.length > 0 && (
        <div role="alert" className="mb-6 rounded-2xl bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">No reminders have been logged for a fast that is about to start.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {silentFasts.map((item) => (
              <li key={`${item.track}:${item.index}`}>
                {TRACK_LABEL[item.track]} fast {item.index} of {item.total} starts {item.daysUntil === 0 ? 'today' : `in ${item.daysUntil} day${item.daysUntil === 1 ? '' : 's'}`} ({item.startDate}).
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">That usually means the hourly reminder cron is not running.</p>
        </div>
      )}

      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([['Standard', data?.byTrack.standard], ['Advanced', data?.byTrack.advanced], ['Very advanced', data?.byTrack.very_advanced], ['Withdrawn', data?.byTrack.withdrawn]] as const).map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-[#edf3e9] p-5">
            <p className="text-xs uppercase tracking-wider text-emerald-900/70">{label}</p>
            <p className="mt-2 text-2xl font-medium text-[#173f2b]">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mb-7">
        <h3 className={`mb-3 ${LABEL}`}>Upcoming fasts</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(data?.schedule || []).map((item) => {
            const totals = data ? occurrenceTotals(data.remindersByOccurrence, item) : { sent: 0, failed: 0, skipped: 0 }
            const past = item.daysUntil < 0
            return (
              <article key={`${item.track}:${item.index}`} className={`rounded-2xl border p-4 ${past ? 'border-neutral-200 text-neutral-500' : 'border-emerald-200'}`}>
                <p className="text-sm font-medium">{TRACK_LABEL[item.track]} · Fast {item.index} of {item.total}</p>
                <p className="mt-1 text-sm text-neutral-600">From {item.startLabel} to {item.endLabel}</p>
                <p className="mt-2 text-sm font-medium text-[#173f2b]">
                  {past ? 'Started' : item.daysUntil === 0 ? 'Starts today' : `In ${item.daysUntil} day${item.daysUntil === 1 ? '' : 's'}`}
                  <span className="ml-2 font-normal text-neutral-500">{item.startDate}</span>
                </p>
                <p className="mt-2 text-xs text-neutral-600">
                  Reminders: <strong className="font-semibold">{totals.sent}</strong> sent
                  {totals.failed > 0 && <span className="text-red-800"> · {totals.failed} failed</span>}
                  {totals.skipped > 0 && <span className="text-amber-900"> · {totals.skipped} skipped</span>}
                </p>
              </article>
            )
          })}
        </div>
      </div>

      <div className="mb-7 overflow-hidden rounded-2xl border border-neutral-200">
        <h3 className="sr-only">Enrolled participants</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">Fasting challenge participants and their enrolment controls</caption>
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
              <tr>{['Participant', 'Track', 'Status', 'Opted in', 'Actions'].map((header) => <th key={header} scope="col" className="px-4 py-3 font-medium">{header}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.enrollments || []).map((row) => (
                <tr key={row.user_id} className="border-t border-neutral-100 align-top">
                  <td className="px-4 py-3">
                    <strong className="font-medium">{row.display_name}</strong>
                    <span className="block text-xs text-neutral-500">{row.email || row.user_id.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`track-${row.user_id}`}>Track for {row.display_name}</label>
                    <select
                      id={`track-${row.user_id}`}
                      value={row.track ?? ''}
                      disabled={busyUser === row.user_id}
                      onChange={(event) => void act(row.user_id, 'set-track', event.target.value as Track)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
                    >
                      <option value="" disabled>No track</option>
                      {TRACKS.map((track) => <option key={track} value={track}>{TRACK_LABEL[track]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${row.status === 'withdrawn' ? 'bg-red-50 text-red-800' : row.status === 'completed' ? 'bg-neutral-100 text-neutral-700' : 'bg-emerald-50 text-emerald-900'}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(row.opted_in_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busyUser === row.user_id || row.status === 'completed'} onClick={() => void act(row.user_id, 'complete')} className="rounded-lg border border-[#173f2b] px-3 py-2 text-xs font-medium text-[#173f2b] disabled:opacity-40">Mark complete</button>
                      <button type="button" disabled={busyUser === row.user_id || row.status === 'withdrawn'} onClick={() => void act(row.user_id, 'withdraw')} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-800 disabled:opacity-40">Withdraw</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && (data?.enrollments.length || 0) === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">Nobody has joined the fasting challenge yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className={`mb-3 ${LABEL}`}>Recent reminder emails</h3>
        {(data?.reminders.length || 0) === 0 ? (
          <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">No reminder emails have been logged yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {(data?.reminders || []).slice(0, 40).map((entry, index) => (
              <li key={`${entry.at}-${entry.user_id}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium">{entry.display_name || entry.user_id.slice(0, 8)}</span>
                <span className="text-neutral-600">{TRACK_LABEL[entry.track as Track] || entry.track} · fast {entry.occurrence} · {TAG_LABEL[entry.tag] || entry.tag}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${entry.result === 'sent' ? 'bg-emerald-50 text-emerald-900' : entry.result === 'failed' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>{entry.result}</span>
                <span className="text-xs text-neutral-500">{formatStamp(entry.at)}</span>
                {entry.detail && <span className="w-full text-xs text-neutral-500">{entry.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
