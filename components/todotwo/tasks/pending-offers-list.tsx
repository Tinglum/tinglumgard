import { Handshake } from 'lucide-react'

import { Surface, EmptyState } from '@/components/todotwo/ui/states'
import type { HandoffRequestRow } from '@/lib/todotwo/queries'

/**
 * Voluntary task offers this person made that are still awaiting the
 * recipient's decision. Read-only — unlike PendingHandoffList, there is
 * nothing to decide here; the person who offered a task already made their
 * choice by creating the request, they're just waiting on the other side.
 */
export function PendingOffersList({ requests }: { requests: HandoffRequestRow[] }) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="Nothing pending"
        description="You have no task offers waiting on someone else's answer."
      />
    )
  }

  return (
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
                Waiting on {request.counterparty_preferred_name || request.counterparty_full_name} to accept or
                decline.
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Surface>
  )
}
