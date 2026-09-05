'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Avatar } from '@/components/todotwo/ui/avatar'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export interface OpenHelpRequest {
  id: string
  taskTitle: string
  dueDate: string | null
  note: string | null
  askedBy: { id: string; fullName: string; preferredName: string | null; photoUrl: string | null }
  isMine: boolean
}

/**
 * What the farm is currently asking for help with.
 *
 * Shown to everybody, because an ask aimed at nobody in particular only works
 * if everybody can see it.
 */
export function OpenHelpRequests({ requests }: { requests: OpenHelpRequest[] }) {
  const router = useRouter()
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  if (requests.length === 0) return null

  async function act(id: string, fn: 'take_over_task' | 'withdraw_help_request') {
    setPending(id)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: rpcError } = await supabase.rpc(fn, { p_request_id: id })

    setPending(null)

    if (rpcError) {
      setError(
        /got there first/i.test(rpcError.message)
          ? 'Somebody got there first.'
          : 'That did not work. Try again shortly.'
      )
      // Either way the list is stale now.
      router.refresh()
      return
    }

    router.refresh()
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
        Can anyone help · {requests.length}
      </h2>

      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex items-start justify-between gap-3 rounded-md border border-[var(--tt-rule)] p-3"
          >
            <div className="flex min-w-0 items-start gap-2">
              <Avatar
                person={{
                  id: request.askedBy.id,
                  fullName: request.askedBy.fullName,
                  preferredName: request.askedBy.preferredName,
                  photoUrl: request.askedBy.photoUrl,
                }}
                size={24}
              />
              <div className="min-w-0">
                <p className="text-[14px]">
                  {request.taskTitle}
                  {request.dueDate ? (
                    <span className="text-[var(--tt-ink-3)]"> · {request.dueDate}</span>
                  ) : null}
                </p>
                <p className="text-[12px] text-[var(--tt-ink-2)]">
                  {request.askedBy.preferredName || request.askedBy.fullName} is asking
                  {request.note ? ` — “${request.note}”` : ''}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {request.isMine ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending === request.id}
                  onClick={() => act(request.id, 'withdraw_help_request')}
                >
                  Never mind
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending === request.id}
                  onClick={() => act(request.id, 'take_over_task')}
                >
                  {pending === request.id ? 'Taking …' : "I'll take it"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {error ? <p className="text-[13px] text-[var(--tt-danger)]">{error}</p> : null}
    </section>
  )
}
