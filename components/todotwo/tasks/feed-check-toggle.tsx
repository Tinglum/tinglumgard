'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * Staff-only toggle for "does completing this routine require the
 * feed-sufficiency question?". A plain client-side update against
 * task_series — RLS (task_series_staff_update) already restricts writes to
 * staff, so no dedicated RPC is needed, matching how the rota editor on this
 * same page persists its own changes.
 */
export function FeedCheckToggle({
  seriesId,
  requiresFeedCheck,
}: {
  seriesId: string
  requiresFeedCheck: boolean
}) {
  const router = useRouter()
  const [checked, setChecked] = React.useState(requiresFeedCheck)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onChange(next: boolean) {
    setChecked(next)
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: updateError } = await supabase
      .from('task_series')
      .update({ requires_feed_check: next })
      .eq('id', seriesId)

    if (updateError) {
      setChecked(!next)
      setError(updateError.message)
    } else {
      router.refresh()
    }

    setPending(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-[13px] text-[var(--tt-ink-2)]">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => void onChange(e.target.checked)}
          className="h-4 w-4"
        />
        Ask "enough feed for the next two days?" when completing this routine
      </label>
      {error ? (
        <p role="alert" className="text-[12px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
