'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { addFarmDays, farmToday } from '@/lib/todotwo/time'
import type { NudgeTask } from '@/lib/todotwo/queries-nudge'

/**
 * The evening squaring-up: your own jobs whose time has gone.
 *
 * Most overdue work on this farm is not forgotten, it is done and unticked —
 * which is the worst possible state, because the count on Today keeps climbing
 * and everybody learns to ignore it. Asking once, in the evening, while the
 * day is still in mind, is what keeps that number meaning something.
 *
 * Three answers and no way to simply close it, because "close" is what turned
 * the overdue list into wallpaper in the first place. Every answer is one tap
 * and all three are honest, so there is nothing to dodge.
 */
export function OverdueCheck({ tasks }: { tasks: NudgeTask[] }) {
  const router = useRouter()
  const [queue, setQueue] = React.useState<NudgeTask[]>(tasks)
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const current = queue[0]
  if (!current) return null

  function next() {
    setQueue((rest) => rest.slice(1))
  }

  async function act(kind: 'done' | 'still_today' | 'tomorrow') {
    setPending(kind)
    setError(null)

    const supabase = getTodoTwoBrowserClient()

    const { error: rpcError } =
      kind === 'done'
        ? await supabase.rpc('complete_task', {
            p_task_id: current.id,
            p_has_enough_food: null,
          })
        : kind === 'tomorrow'
          ? await supabase.rpc('defer_task', {
              p_task_id: current.id,
              p_new_date: addFarmDays(farmToday(), 1),
            })
          : await supabase.rpc('record_nudge_response', {
              p_task_id: current.id,
              p_response: 'still_today',
            })

    setPending(null)

    if (rpcError) {
      setError(
        /already finished/i.test(rpcError.message)
          ? 'That one is already done.'
          : 'That did not save. Try again.'
      )
      next()
      return
    }

    next()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-5 shadow-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-danger)]">
          Still open
          {queue.length > 1 ? ` · 1 of ${queue.length}` : ''}
        </p>

        <h2 className="mt-2 text-[18px] font-semibold leading-snug">{current.title}</h2>

        {current.dueDate ? (
          <p className="mt-1 text-[13px] text-[var(--tt-ink-3)]">Was due {current.dueDate}</p>
        ) : null}

        <p className="mt-2 text-[13px] text-[var(--tt-ink-2)]">
          This one is yours and its time has gone. If you already did it, tick it off now — an
          untick job counts as late all week and makes the overdue number worthless.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Button disabled={pending !== null} onClick={() => act('done')}>
            {pending === 'done' ? 'Saving …' : 'Done — I did this'}
          </Button>

          <Button
            variant="secondary"
            disabled={pending !== null}
            onClick={() => act('still_today')}
          >
            {pending === 'still_today' ? 'Saving …' : 'Not yet — I’m doing it today'}
          </Button>

          <Button variant="ghost" disabled={pending !== null} onClick={() => act('tomorrow')}>
            {pending === 'tomorrow' ? 'Saving …' : 'Move it to tomorrow'}
          </Button>
        </div>

        {error ? <p className="mt-2 text-[13px] text-[var(--tt-danger)]">{error}</p> : null}
      </div>
    </div>
  )
}
