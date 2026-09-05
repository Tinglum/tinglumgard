'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * "I cannot do this one — will anybody?"
 *
 * Deliberately not the same as offering it to a named person. Picking
 * somebody to burden is a bigger social act than asking the room, and the
 * person best placed to take it is usually whoever reads the message first.
 *
 * Asking does not drop the task. It stays yours until somebody actually takes
 * it, so nothing falls between two people.
 */
export function AskForHelp({ taskId, alreadyAsked }: { taskId: string; alreadyAsked: boolean }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function ask() {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: rpcError } = await supabase.rpc('ask_for_help', {
      p_task_id: taskId,
      p_note: note.trim() || null,
    })

    setPending(false)

    if (rpcError) {
      setError(
        /already asked/i.test(rpcError.message)
          ? 'Somebody has already asked about this one.'
          : /not yours/i.test(rpcError.message)
            ? 'Only the person holding a task can hand it on.'
            : 'Could not ask just now. Try again shortly.'
      )
      return
    }

    setOpen(false)
    setNote('')
    router.refresh()
  }

  if (alreadyAsked) {
    return (
      <p className="text-[13px] text-[var(--tt-ink-2)]">
        You have asked the group about this one. It stays yours until somebody takes it.
      </p>
    )
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="self-start">
        Ask if anyone can take this
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--tt-rule)] p-3">
      <label className="text-[13px]">
        Anything they should know? (optional)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Back late from town"
          className="mt-1 min-h-[40px] w-full rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[15px]"
        />
      </label>
      <p className="text-[12px] text-[var(--tt-ink-3)]">
        Everyone will see it. Until somebody takes it, it is still yours.
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={ask}>
          {pending ? 'Asking …' : 'Ask the group'}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-[13px] text-[var(--tt-danger)]">{error}</p> : null}
    </div>
  )
}
