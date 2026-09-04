'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import type { FarmDate } from '@/lib/todotwo/time'

/**
 * Plain HTML date input that navigates to /roster?date=YYYY-MM-DD on change.
 * Kept as a tiny client island so the page itself stays a server component.
 */
export function RosterDatePicker({ date }: { date: FarmDate }) {
  const router = useRouter()

  return (
    <input
      type="date"
      value={date}
      onChange={(event) => {
        const next = event.target.value
        if (!next) return
        router.push(`${TODOTWO_BASE}/roster?date=${next}`)
      }}
      className="rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 py-1.5 text-[14px] text-[var(--tt-ink)]"
      aria-label="Roster start date"
    />
  )
}
