'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ConfirmDialog } from '@/components/todotwo/ui/confirm-dialog'
import { Surface, EmptyState } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { TimeOffRequestRow } from '@/lib/todotwo/queries'

const KIND_LABEL: Record<string, string> = {
  day_off: 'Day off',
  appointment: 'Appointment',
  trip: 'Trip',
  illness: 'Illness',
  partial_day: 'Partial day',
}

function formatRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`
}

/**
 * Staff approve or decline pending time-off requests. Both actions call
 * todotwo.decide_time_off() — never a direct table update — so the
 * pending -> approved/declined transition is always re-checked server-side
 * against the caller's actual role, per RLS.md's narrow-write pattern.
 * Declining is behind a confirm dialog: it is the semi-destructive one, since
 * it turns down someone's actual plans.
 */
export function PendingApprovalsList({ requests }: { requests: TimeOffRequestRow[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [declineTarget, setDeclineTarget] = React.useState<TimeOffRequestRow | null>(null)

  async function decide(request: TimeOffRequestRow, decision: 'approved' | 'declined') {
    setPendingId(request.id)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('decide_time_off', {
        p_request_id: request.id,
        p_decision: decision,
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
      <EmptyState
        icon={CheckCircle2}
        title="Nothing waiting"
        description="Every time-off request has been decided."
      />
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
                <p className="text-[15px]">{request.preferred_name || request.full_name}</p>
                <p className="tabular-nums text-[13px] text-[var(--tt-ink-3)]">
                  {formatRange(request.start_date, request.end_date)} — {KIND_LABEL[request.kind] ?? request.kind}
                </p>
                {request.reason ? (
                  <p className="truncate text-[13px] text-[var(--tt-ink-3)]">{request.reason}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={pendingId === request.id}
                  onClick={() => decide(request, 'approved')}
                >
                  Approve
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
        title="Decline this request?"
        description={
          declineTarget
            ? `${declineTarget.preferred_name || declineTarget.full_name}, ${formatRange(
                declineTarget.start_date,
                declineTarget.end_date
              )}. They will see this as declined.`
            : undefined
        }
        confirmLabel="Decline"
        destructive
        onConfirm={async () => {
          if (declineTarget) await decide(declineTarget, 'declined')
        }}
      />
    </>
  )
}
