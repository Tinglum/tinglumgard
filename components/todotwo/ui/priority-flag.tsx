import * as React from 'react'
import { Flag } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Todoist-style priority, P1 (most urgent) through P4 (the default). Shared
 * so every list — Today, Upcoming, Favorites, task detail — renders the same
 * flag rather than each screen inventing its own color mapping.
 */
export const PRIORITY_COLOR: Record<number, string> = {
  1: 'var(--tt-danger)',
  2: 'var(--tt-warn)',
  3: 'var(--tt-accent)',
  4: 'var(--tt-ink-3)',
}

export const PRIORITY_LABEL: Record<number, string> = {
  1: 'Priority 1 — urgent',
  2: 'Priority 2',
  3: 'Priority 3',
  4: 'Priority 4 — normal',
}

/**
 * A small colored flag. Priority 4 (the default on almost every task) renders
 * in a muted tone so it recedes rather than drawing the eye — the flag is
 * meant to surface the exceptions, not decorate every row.
 */
export function PriorityFlag({
  priority,
  className,
}: {
  priority: number
  className?: string
}) {
  if (!priority || priority < 1 || priority > 4) return null

  return (
    <Flag
      className={cn('h-3.5 w-3.5 shrink-0', priority === 4 && 'opacity-50', className)}
      style={{ color: PRIORITY_COLOR[priority] }}
      aria-label={PRIORITY_LABEL[priority]}
      fill={priority < 4 ? PRIORITY_COLOR[priority] : 'none'}
    />
  )
}
