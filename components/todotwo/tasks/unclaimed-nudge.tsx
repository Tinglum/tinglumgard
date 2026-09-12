'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { NudgeTask } from '@/lib/todotwo/queries-nudge'

/**
 * "Nobody has picked this up. Who is taking charge?"
 *
 * Asked one task at a time rather than as a list, because a list of five
 * invites you to close the whole thing, and a single question with three
 * buttons does not.
 *
 * The wording matters more than the mechanism. "Will you do this?" is easy to
 * dodge at eleven at night; "who is taking charge of it" is a smaller thing to
 * agree to and the thing that actually needs settling. Taking charge means
 * making sure it happens — roping somebody in, doing it at six tomorrow,
 * whatever — not doing it alone tonight.
 */
export function UnclaimedNudge({ tasks }: { tasks: NudgeTask[] }) {
  const router = useRouter()
  const [queue, setQueue] = React.useState<NudgeTask[]>(tasks)
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const current = queue[0]
  if (!current) return null

  async function answer(response: 'took_charge' | 'someone_else' | 'another_day') {
    setPending(response)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: rpcError } = await supabase.rpc('record_nudge_response', {
      p_task_id: current.id,
      p_response: response,
    })

    setPending(null)

    if (rpcError) {
      setError(
        /already finished/i.test(rpcError.message)
          ? 'That one is already done — nothing to sort out.'
          : /taken that one on/i.test(rpcError.message)
            ? 'Somebody just took it. Moving on.'
            : 'That did not save. Try again.'
      )
      // Either way the answer is stale, so do not keep asking about it.
      setQueue((rest) => rest.slice(1))
      return
    }

    setQueue((rest) => rest.slice(1))
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-5 shadow-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Nobody has taken this on
          {queue.length > 1 ? ` · 1 of ${queue.length}` : ''}
        </p>

        <h2 className="mt-2 text-[18px] font-semibold leading-snug">{current.title}</h2>

        <p className="mt-2 text-[13px] text-[var(--tt-ink-2)]">
          It was up for grabs today and it is still nobody’s. Taking charge means making sure it
          gets done — asking someone, doing it in the morning, whatever works. It does not mean
          doing it alone tonight.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Button disabled={pending !== null} onClick={() => answer('took_charge')}>
            {pending === 'took_charge' ? 'Saving …' : 'I’ll take charge of this'}
          </Button>

          <Button
            variant="secondary"
            disabled={pending !== null}
            onClick={() => answer('someone_else')}
          >
            {pending === 'someone_else' ? 'Saving …' : 'Someone else has taken charge'}
          </Button>

          <Button
            variant="ghost"
            disabled={pending !== null}
            onClick={() => answer('another_day')}
          >
            {pending === 'another_day' ? 'Saving …' : 'We’re doing this another day'}
          </Button>
        </div>

        <p className="mt-3 text-[12px] text-[var(--tt-ink-3)]">
          “Someone else has taken charge” only quietens it for you. The other two are shown to
          everybody in Notifications.
        </p>

        {error ? <p className="mt-2 text-[13px] text-[var(--tt-danger)]">{error}</p> : null}
      </div>
    </div>
  )
}
