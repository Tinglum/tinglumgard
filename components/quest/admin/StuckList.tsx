'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ParticipantRow } from './QuestionBreakdown'

const AMBER_MS = 3 * 60 * 1000
const RED_MS = 10 * 60 * 1000
const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-[.16em] text-emerald-800'

function relativeLabel(lastSeen: number, now: number) {
  if (!Number.isFinite(lastSeen)) return 'last seen unknown'
  const seconds = Math.max(0, Math.round((now - lastSeen) / 1000))
  if (seconds < 45) return 'last seen just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `last seen ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `last seen ${hours}h ${minutes % 60}m ago`
}

export function StuckList({
  participants,
  releasedSection,
}: {
  participants: ParticipantRow[]
  releasedSection: number
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const expected = Math.max(0, Math.min(25, releasedSection * 5))

  const rows = useMemo(() => {
    return participants
      .filter((participant) => !participant.submitted_at)
      .map((participant) => {
        const lastSeen = new Date(participant.last_seen_at).getTime()
        return { participant, lastSeen: Number.isFinite(lastSeen) ? lastSeen : 0 }
      })
      .sort((a, b) => a.lastSeen - b.lastSeen)
  }, [participants])

  const behind = rows.filter(
    (row) => now - row.lastSeen > AMBER_MS || row.participant.answered_count < expected,
  ).length

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7" aria-labelledby="stuck-list-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={SECTION_LABEL}>Live room check</p>
          <h2 id="stuck-list-heading" className="mt-2 text-xl font-medium sm:text-2xl">
            Who is stuck
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Oldest activity first. Expecting {expected} of 25 answers after part {Math.max(0, releasedSection)}.
          </p>
        </div>
        <p className="rounded-full bg-[#edf3e9] px-4 py-2 text-sm font-medium text-emerald-900">
          {behind} need{behind === 1 ? 's' : ''} a nudge
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-[#edf3e9] p-6 text-center text-neutral-600">Everyone is keeping up.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ participant, lastSeen }) => {
            const idle = now - lastSeen
            const level = idle > RED_MS ? 'red' : idle > AMBER_MS ? 'amber' : 'ok'
            const progress = expected ? Math.min(100, Math.round((participant.answered_count / expected) * 100)) : 0
            const tone =
              level === 'red'
                ? 'border-red-300 bg-red-50'
                : level === 'amber'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-neutral-200 bg-white'
            return (
              <li key={participant.id} className={`rounded-2xl border p-4 ${tone}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <strong className="min-w-0 font-medium">{participant.display_name}</strong>
                  <span
                    className={`whitespace-nowrap text-sm ${
                      level === 'red'
                        ? 'font-medium text-red-800'
                        : level === 'amber'
                          ? 'font-medium text-amber-800'
                          : 'text-neutral-500'
                    }`}
                  >
                    {relativeLabel(lastSeen, now)}
                    {level !== 'ok' && <span className="sr-only"> — falling behind</span>}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">
                  On Q{Math.min(25, participant.current_question || 1)} · {participant.answered_count} of {expected}{' '}
                  released answered
                </p>
                <span
                  className="mt-2 block h-2 overflow-hidden rounded-full bg-neutral-200/70"
                  role="img"
                  aria-label={`${participant.display_name} answered ${participant.answered_count} of ${expected} released questions`}
                >
                  <span
                    className="block h-full rounded-full bg-[#3f7354] transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
