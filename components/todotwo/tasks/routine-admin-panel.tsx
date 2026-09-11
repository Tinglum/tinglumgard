'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * The management half of a routine card, folded away until asked for.
 *
 * Editing, the rota and the feed-check switch are things you do occasionally
 * and read never. Left open they were most of the height of every card, so
 * twenty-seven routines became a very long page in which the thing you
 * actually came to check — what a routine is and when it runs — was the
 * smallest part.
 *
 * Closed by default, and open state is per card: opening one to fix the goats
 * should not unfold the other twenty-six.
 */
export function RoutineAdminPanel({
  children,
  label = 'Manage',
}: {
  children: React.ReactNode
  label?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="border-t border-[var(--tt-rule)] pt-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 text-[13px] text-[var(--tt-ink-2)] hover:underline"
      >
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
        {label}
      </button>

      {/* Kept mounted, so a part-written step survives a stray collapse. */}
      <div hidden={!open} className="flex flex-col gap-4 pt-3">
        {children}
      </div>
    </div>
  )
}
