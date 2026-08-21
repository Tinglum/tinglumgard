'use client'

import { useMemo, useState } from 'react'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'

/**
 * Shape returned for each participant by `GET /api/quest/admin`.
 * Declared here so the read-only admin views can be dropped in without
 * reaching into the route or the live store for types.
 */
export type ParticipantRow = {
  id: string
  display_name: string
  email?: string | null
  answers: Record<string, string>
  answered_count: number
  current_question: number
  earned_points: number
  section_scores: number[]
  last_seen_at: string
  submitted_at?: string | null
  feedback?: { message: string; updated_at: string; sent_at?: string } | null
  fasting_challenge?: {
    opted_in: boolean
    track?: 'standard' | 'advanced' | 'very_advanced'
    status: 'enrolled' | 'withdrawn' | 'completed'
    updated_at: string
  } | null
}

const CHOICE_IDS = ['A', 'B', 'C', 'D', 'E'] as const
type ChoiceId = (typeof CHOICE_IDS)[number]

type QuestionStat = {
  id: string
  order: number
  prompt: string
  sectionIndex: number
  answered: number
  counts: number[]
  mean: number | null
}

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-[.16em] text-emerald-800'

function buildStats(participants: ParticipantRow[]): QuestionStat[] {
  return QUEST_ASSESSMENT.questions.map((question) => {
    const counts = [0, 0, 0, 0, 0]
    let total = 0
    let answered = 0
    participants.forEach((participant) => {
      const key = participant.answers?.[question.id]
      const score = key ? CHOICE_IDS.indexOf(key as ChoiceId) : -1
      if (score < 0) return
      counts[score] += 1
      total += score
      answered += 1
    })
    return {
      id: question.id,
      order: question.order,
      prompt: question.prompt.en,
      sectionIndex: Math.ceil(question.order / 5) - 1,
      answered,
      counts,
      mean: answered ? total / answered : null,
    }
  })
}

function DistributionRow({ stat }: { stat: QuestionStat }) {
  const label = CHOICE_IDS.map(
    (id, index) =>
      `${id} ${stat.counts[index]} (${stat.answered ? Math.round((stat.counts[index] / stat.answered) * 100) : 0}%)`,
  ).join(', ')
  return (
    <div role="img" aria-label={`Q${stat.order} answer distribution: ${stat.answered ? label : 'no answers yet'}`}>
      <ul className="space-y-1.5">
        {CHOICE_IDS.map((choiceId, index) => {
          const count = stat.counts[index]
          const percent = stat.answered ? Math.round((count / stat.answered) * 100) : 0
          return (
            <li key={choiceId} className="flex items-center gap-2 sm:gap-3">
              <span className="w-4 shrink-0 text-xs font-semibold text-neutral-600">{choiceId}</span>
              <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <span
                  className="block h-full rounded-full bg-[#2f7551] transition-[width] duration-500"
                  style={{ width: `${count ? Math.max(percent, 2) : 0}%` }}
                />
              </span>
              <span className="w-[5.5rem] shrink-0 text-right text-xs tabular-nums text-neutral-500">
                {count} · {percent}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function QuestionCard({ stat, total }: { stat: QuestionStat; total: number }) {
  return (
    <article className="rounded-2xl border border-neutral-200 p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="min-w-0 flex-1 text-sm font-medium sm:text-base">
          <span className="mr-2 font-semibold text-emerald-800">Q{stat.order}</span>
          {stat.prompt}
        </h4>
        <p className="whitespace-nowrap text-sm text-neutral-500">
          <strong className="font-medium text-[#173f2b]">{stat.mean === null ? '—' : stat.mean.toFixed(2)}</strong> / 4 mean
        </p>
      </header>
      <p className="mb-3 text-xs text-neutral-500">
        {stat.answered} of {total} answered
      </p>
      <DistributionRow stat={stat} />
    </article>
  )
}

export function QuestionBreakdown({ participants }: { participants: ParticipantRow[] }) {
  const [sortMode, setSortMode] = useState<'order' | 'weakest'>('order')
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const stats = useMemo(() => buildStats(participants), [participants])
  const total = participants.length

  const weakest = useMemo(
    () =>
      stats
        .slice()
        .sort((a, b) => {
          if (a.mean === null && b.mean === null) return a.order - b.order
          if (a.mean === null) return 1
          if (b.mean === null) return -1
          return a.mean - b.mean || a.order - b.order
        }),
    [stats],
  )

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7" aria-labelledby="question-breakdown-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={SECTION_LABEL}>Per-question cohort view</p>
          <h2 id="question-breakdown-heading" className="mt-2 text-xl font-medium sm:text-2xl">
            How each question landed
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Anonymous · A scores 0 and E scores 4, so a low mean marks the room&rsquo;s weakest question.
          </p>
        </div>
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Sort questions</legend>
          {(
            [
              ['order', 'Question order'],
              ['weakest', 'Lowest mean first'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={sortMode === mode}
              onClick={() => setSortMode(mode)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                sortMode === mode
                  ? 'bg-[#173f2b] text-white'
                  : 'border border-neutral-300 bg-white text-[#173f2b] hover:bg-[#edf3e9]'
              }`}
            >
              {label}
            </button>
          ))}
        </fieldset>
      </div>

      {!total && <p className="rounded-2xl bg-[#edf3e9] p-6 text-center text-neutral-600">No answers recorded yet.</p>}

      {total > 0 && sortMode === 'weakest' && (
        <ol className="grid gap-4 md:grid-cols-2">
          {weakest.map((stat, index) => (
            <li key={stat.id}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className={SECTION_LABEL}>
                  #{index + 1} · Part {stat.sectionIndex + 1}
                </span>
              </div>
              <QuestionCard stat={stat} total={total} />
            </li>
          ))}
        </ol>
      )}

      {total > 0 &&
        sortMode === 'order' &&
        QUEST_ASSESSMENT.sections.map((section, sectionIndex) => {
          const sectionStats = stats.filter((stat) => stat.sectionIndex === sectionIndex)
          const answered = sectionStats.reduce((sum, stat) => sum + stat.answered, 0)
          const scored = sectionStats.filter((stat) => stat.mean !== null)
          const sectionMean = scored.length
            ? scored.reduce((sum, stat) => sum + (stat.mean || 0), 0) / scored.length
            : null
          const isOpen = !collapsed[sectionIndex]
          return (
            <div key={section.id} className="mb-4 overflow-hidden rounded-2xl border border-neutral-200 last:mb-0">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`question-breakdown-panel-${sectionIndex}`}
                  onClick={() => setCollapsed((current) => ({ ...current, [sectionIndex]: isOpen }))}
                  className="flex w-full flex-wrap items-center justify-between gap-3 bg-[#edf3e9] px-4 py-3 text-left sm:px-5"
                >
                  <span className="min-w-0">
                    <span className={`${SECTION_LABEL} block`}>Part {sectionIndex + 1}</span>
                    <span className="mt-1 block text-base font-medium">{section.title.en}</span>
                  </span>
                  <span className="flex items-center gap-3 text-sm text-neutral-600">
                    <span className="whitespace-nowrap">
                      mean {sectionMean === null ? '—' : sectionMean.toFixed(2)} / 4
                    </span>
                    <span className="whitespace-nowrap text-neutral-500">{answered} answers</span>
                    <span aria-hidden="true" className="text-lg leading-none text-[#173f2b]">
                      {isOpen ? '−' : '+'}
                    </span>
                  </span>
                </button>
              </h3>
              {isOpen && (
                <div id={`question-breakdown-panel-${sectionIndex}`} className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
                  {sectionStats.map((stat) => (
                    <QuestionCard key={stat.id} stat={stat} total={total} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
    </section>
  )
}
