'use client'

import { Clock } from 'lucide-react'
import type { TrainingFormat } from '@/lib/bnimsp/types'
import { FORMATS, formatLabel, formatBadge, type FormatTotals } from '@/lib/bnimsp/format'
import { formatMinutes } from '@/lib/bnimsp/util'

interface Props {
  format: TrainingFormat
  onChange: (fmt: TrainingFormat) => void
  totals: FormatTotals
}

/**
 * Compact segmented control to switch training format, with a live time budget.
 * Switching reshapes the whole studio (which slides show, which script/task/timing).
 */
export function FormatBar({ format, onChange, totals }: Props) {
  // Budget colour: green within target, amber when over, muted when well under.
  const over = totals.delta > 0
  const tight = !over && totals.delta >= -10 // within 10 min of target
  const budgetTone = over
    ? 'text-[var(--bni-red)]'
    : tight
      ? 'text-emerald-600'
      : 'text-[var(--bni-muted)]'

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--bni-line)] bg-white p-2 pl-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--bni-muted)]">
        <Clock className="h-3.5 w-3.5 text-[var(--bni-red)]" />
        Format
      </span>

      <div className="inline-flex rounded-lg bg-zinc-100 p-0.5">
        {FORMATS.map((fmt) => {
          const active = fmt === format
          return (
            <button
              key={fmt}
              onClick={() => onChange(fmt)}
              aria-pressed={active}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-[var(--bni-red)] text-white shadow-sm'
                  : 'text-[var(--bni-ink)] hover:bg-white'
              }`}
            >
              {formatLabel(fmt)}
              <span className={`ml-1.5 text-[11px] font-medium ${active ? 'text-white/80' : 'text-[var(--bni-muted)]'}`}>
                {formatBadge(fmt)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 pr-1 text-sm">
        <span className="text-[var(--bni-muted)]">
          {totals.count} slides
        </span>
        <span className={`font-semibold ${budgetTone}`}>
          {formatMinutes(totals.minutes)}
          <span className="font-normal text-[var(--bni-muted)]"> / {totals.target} min</span>
        </span>
        {over && (
          <span className="rounded-full bg-[var(--bni-red)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--bni-red)]">
            {totals.delta} min over
          </span>
        )}
      </div>
    </div>
  )
}
