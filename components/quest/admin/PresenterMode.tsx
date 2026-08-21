'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'
import type { ParticipantRow } from './QuestionBreakdown'

type PresenterEvent = {
  id: string
  name: string
  join_code_label: string
  status: 'active' | 'paused' | 'ended'
  released_section: number
  results_released: boolean
}

type PresenterDashboard = {
  activeEvent: PresenterEvent | null
  participants: ParticipantRow[]
  totalAnswers: number
}

const CHOICE_IDS = ['A', 'B', 'C', 'D', 'E'] as const

/**
 * Projector view. Deliberately shows no participant names — this goes on a
 * screen in a room full of the people it is counting.
 */
export function PresenterMode() {
  const [data, setData] = useState<PresenterDashboard | null>(null)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)

  const load = useCallback(async () => {
    const response = await fetch('/api/quest/admin', { cache: 'no-store' })
    if (response.status === 401) {
      setError('Sign in as an administrator')
      return
    }
    const payload = await response.json()
    if (!response.ok) {
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not load the session')
      return
    }
    setData(payload as PresenterDashboard)
    setError('')
  }, [])

  useEffect(() => {
    load().catch(() => setError('Could not load the session'))
    const id = setInterval(() => {
      load().catch(() => undefined)
    }, 4000)
    return () => clearInterval(id)
  }, [load])

  const event = data?.activeEvent || null
  const released = Math.max(0, Math.min(5, event?.released_section || 0))
  const participants = useMemo(() => data?.participants || [], [data])

  const releasedQuestions = useMemo(
    () => QUEST_ASSESSMENT.questions.filter((question) => Math.ceil(question.order / 5) <= released),
    [released],
  )

  // Keep the selection inside the released range as more parts open up.
  useEffect(() => {
    setIndex((current) => (releasedQuestions.length ? Math.min(current, releasedQuestions.length - 1) : 0))
  }, [releasedQuestions.length])

  const question = releasedQuestions[index] || null

  const counts = useMemo(() => {
    const totals = [0, 0, 0, 0, 0]
    if (!question) return totals
    participants.forEach((participant) => {
      const key = participant.answers?.[question.id]
      const score = key ? CHOICE_IDS.indexOf(key as (typeof CHOICE_IDS)[number]) : -1
      if (score >= 0) totals[score] += 1
    })
    return totals
  }, [participants, question])

  const answeredForQuestion = counts.reduce((sum, count) => sum + count, 0)

  // How many people have finished every question in the current released part.
  const currentPartDone = useMemo(() => {
    if (!released) return 0
    const start = (released - 1) * 5 + 1
    return participants.filter((participant) =>
      [0, 1, 2, 3, 4].every((offset) => Boolean(participant.answers?.[`Q${start + offset}`])),
    ).length
  }, [participants, released])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1d15] px-8 text-center text-[#e6f0e6]">
        <p className="text-3xl font-medium sm:text-5xl">{error}</p>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1d15] px-8 text-center text-[#e6f0e6]">
        <p className="text-3xl font-medium sm:text-5xl">
          {data ? 'No live session yet' : 'Loading the room…'}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f1d15] px-6 py-8 text-[#e6f0e6] sm:px-12 sm:py-12">
      <div className="mx-auto flex min-h-[85vh] max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-base font-semibold uppercase tracking-[.22em] text-emerald-300 sm:text-lg">
              {released ? `Part ${released} of 5` : 'Not started'}
            </p>
            <h1 className="mt-2 text-4xl font-medium sm:text-6xl">{event.name}</h1>
          </div>
          <div className="rounded-3xl border border-emerald-300/30 bg-white/5 px-7 py-4 text-right">
            <p className="text-sm uppercase tracking-[.22em] text-emerald-300/90 sm:text-base">Join code</p>
            <p className="mt-1 text-4xl font-semibold tracking-[.18em] sm:text-6xl">{event.join_code_label}</p>
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-3" aria-label="Room progress">
          {[
            ['In the room', String(participants.length)],
            [released ? `Finished part ${released}` : 'Finished', String(currentPartDone)],
            ['Answers recorded', String(data?.totalAnswers ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-emerald-300/20 bg-white/5 px-7 py-6">
              <p className="text-lg uppercase tracking-[.16em] text-emerald-300/90">{label}</p>
              <p className="mt-2 text-6xl font-semibold tabular-nums sm:text-7xl">{value}</p>
            </div>
          ))}
        </section>

        {question ? (
          <section className="flex-1 rounded-3xl border border-emerald-300/20 bg-white/5 p-7 sm:p-10" aria-live="polite">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
              <h2 className="min-w-0 flex-1 text-2xl font-medium leading-snug sm:text-4xl">
                <span className="mr-3 text-emerald-300">Q{question.order}</span>
                {question.prompt.en}
              </h2>
              <p className="whitespace-nowrap text-xl text-emerald-200/80 sm:text-2xl">
                {answeredForQuestion} answered
              </p>
            </div>

            <div
              className="flex h-56 items-end gap-4 border-b border-emerald-300/30 pb-1 sm:h-72 sm:gap-8"
              role="img"
              aria-label={`Answer distribution for question ${question.order}: ${CHOICE_IDS.map(
                (id, i) => `${id} ${counts[i]}`,
              ).join(', ')}`}
            >
              {CHOICE_IDS.map((choiceId, i) => {
                const percent = answeredForQuestion ? Math.round((counts[i] / answeredForQuestion) * 100) : 0
                return (
                  <div key={choiceId} className="flex h-full flex-1 flex-col justify-end text-center">
                    <span className="mb-2 text-2xl font-semibold tabular-nums sm:text-3xl">{percent}%</span>
                    <span
                      className="mx-auto w-full rounded-t-xl bg-[#3f7354] transition-[height] duration-500"
                      style={{ height: `${counts[i] ? Math.max(percent, 3) : 0}%` }}
                    />
                    <span className="mt-3 text-3xl font-semibold sm:text-4xl">{choiceId}</span>
                    <span className="text-lg text-emerald-200/70 sm:text-xl">{counts[i]}</span>
                  </div>
                )
              })}
            </div>

            <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Step through released questions">
              <button
                type="button"
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
                disabled={index === 0}
                className="rounded-2xl border border-emerald-300/40 px-7 py-4 text-xl font-medium disabled:opacity-30 sm:text-2xl"
              >
                ← Previous
              </button>
              <p className="text-xl text-emerald-200/80 sm:text-2xl">
                {index + 1} of {releasedQuestions.length} released
              </p>
              <button
                type="button"
                onClick={() => setIndex((current) => Math.min(releasedQuestions.length - 1, current + 1))}
                disabled={index >= releasedQuestions.length - 1}
                className="rounded-2xl border border-emerald-300/40 px-7 py-4 text-xl font-medium disabled:opacity-30 sm:text-2xl"
              >
                Next →
              </button>
            </nav>
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center rounded-3xl border border-emerald-300/20 bg-white/5 p-10">
            <p className="text-3xl font-medium sm:text-5xl">Waiting for part 1 to open</p>
          </section>
        )}
      </div>
    </main>
  )
}
