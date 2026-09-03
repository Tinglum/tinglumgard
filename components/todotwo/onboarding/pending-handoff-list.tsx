'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Handshake } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ConfirmDialog } from '@/components/todotwo/ui/confirm-dialog'
import { Surface, EmptyState } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { HandoffRequestRow } from '@/lib/todotwo/queries'

/**
 * A person's own pending task-handoff requests — occurrences they currently
 * hold that someone else has asked to take over. Modelled on
 * PendingApprovalsList: both actions go through todotwo.decide_task_handoff(),
 * never a direct table update, so the pending -> accepted/declined transition
 * is always re-checked server-side against the caller's actual identity.
 */
export function PendingHandoffList({ requests }: { requests: HandoffRequestRow[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [declineTarget, setDeclineTarget] = React.useState<HandoffRequestRow | null>(null)

  async function decide(request: HandoffRequestRow, accept: boolean) {
    setPendingId(request.id)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('decide_task_handoff', {
        p_handoff_id: request.id,
        p_accept: accept,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <EmptyState icon={Handshake} title="Nothing waiting" description="No one is asking to take over a task of yours." />
    )
  }

  return (
    <>
      <Surface className="px-4">
        <ul className="list-none">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[15px]">{request.task_title}</p>
                <p className="text-[13px] text-[var(--tt-ink-3)]">
                  {(request.to_preferred_name || request.to_full_name)} would like to do this task — is it OK to
                  give it away?
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={pendingId === request.id}
                  onClick={() => decide(request, true)}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pendingId === request.id}
                  onClick={() => setDeclineTarget(request)}
                >
                  Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Surface>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={declineTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeclineTarget(null)
        }}
        title="Decline this handoff?"
        description={
          declineTarget
            ? `"${declineTarget.task_title}" stays with you. ${
                declineTarget.to_preferred_name || declineTarget.to_full_name
              } will see this as declined.`
            : undefined
        }
        confirmLabel="Decline"
        destructive
        onConfirm={async () => {
          if (declineTarget) await decide(declineTarget, false)
        }}
      />
    </>
  )
}
