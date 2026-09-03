'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Handshake } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export interface OfferTaskCandidate {
  id: string
  full_name: string
  preferred_name: string | null
}

/**
 * Lets the current holder of a task offer it to someone else. Calls
 * todotwo.request_task_handoff() with p_direction = 'offer' — the same
 * table/RPC pair the onboarding-ramp cron uses, just with the recipient
 * (not the offerer) as the one who must accept or decline. Only rendered
 * for the task's current assignee; the function itself also checks this
 * server-side.
 */
export function OfferTaskButton({
  taskId,
  candidates,
}: {
  taskId: string
  candidates: OfferTaskCandidate[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [chosenId, setChosenId] = React.useState(candidates[0]?.id ?? '')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  async function confirm() {
    if (!chosenId) return
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('request_task_handoff', {
        p_task_id: taskId,
        p_to_person_id: chosenId,
        p_direction: 'offer',
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setOpen(false)
      setDone(true)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (candidates.length === 0) return null

  if (done) {
    return (
      <p className="text-[13px] text-[var(--tt-ink-3)]">Offer sent — waiting for them to respond.</p>
    )
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Handshake className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Offer this task to someone
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--tt-rule)] p-4">
      <p className="text-[13px] text-[var(--tt-ink-2)]">
        They&apos;ll be asked to accept or decline. The task stays yours until they accept.
      </p>
      <label className="flex flex-col gap-1 text-[13px]">
        Offer to
        <select
          value={chosenId}
          onChange={(e) => setChosenId(e.target.value)}
          className="rounded-md border border-[var(--tt-rule)] bg-transparent px-3 py-2 text-[14px]"
        >
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.preferred_name || c.full_name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" disabled={pending} onClick={confirm}>
          Send offer
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
