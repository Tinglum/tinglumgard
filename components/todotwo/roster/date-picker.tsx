'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import { addFarmDays, farmToday, type FarmDate } from '@/lib/todotwo/time'

/**
 * Date selector with 1-tap Yesterday / Today / Tomorrow quick pills so checking
 * who was responsible yesterday takes a single tap.
 */
export function RosterDatePicker({ date }: { date: FarmDate }) {
  const router = useRouter()
  const today = farmToday()
  const yesterday = addFarmDays(today, -1)
  const tomorrow = addFarmDays(today, 1)

  function go(next: string) {
    if (!next) return
    router.push(`${TODOTWO_BASE}/roster?date=${next}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-[var(--tt-rule)] bg-[var(--tt-surface-2)]/80 p-1">
        {(
          [
            { label: 'Yesterday', value: yesterday },
            { label: 'Today', value: today },
            { label: 'Tomorrow', value: tomorrow },
          ] as const
        ).map((item) => {
          const active = date === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => go(item.value)}
              className={cn(
                'rounded-lg px-3 py-1 text-[12.5px] font-medium transition-all',
                active
                  ? 'bg-[var(--tt-surface)] font-semibold text-[var(--tt-ink)] shadow-[var(--tt-shadow-xs)]'
                  : 'text-[var(--tt-ink-2)] hover:text-[var(--tt-ink)]'
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <input
        type="date"
        value={date}
        onChange={(event) => go(event.target.value)}
        className="min-h-[36px] rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 py-1 text-[13.5px] font-medium text-[var(--tt-ink)]"
        aria-label="Roster start date"
      />
    </div>
  )
}
