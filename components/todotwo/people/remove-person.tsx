'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import type { PersonDetail, PersonFootprint } from '@/lib/todotwo/queries-person'

/**
 * Removing someone, in the two senses that actually differ.
 *
 * Archiving sets deleted_at: they leave every list and every rota, and
 * everything they ever did stays exactly where it is. That is what "delete"
 * means nearly every time somebody asks for it — a Workawayer went home.
 *
 * Permanent deletion is a different act. Most tables that reference a person
 * are ON DELETE CASCADE, so the row takes their assignments, stays, time off,
 * skills and private notes with it, and completed tasks lose who completed
 * them (completed_by_person_id is ON DELETE SET NULL). It is offered because
 * a genuine mistake — a duplicate, a test entry — should not be permanent,
 * but it shows the real numbers first rather than a vague warning.
 */
export function RemovePerson({
  person,
  footprint,
}: {
  person: PersonDetail
  footprint: PersonFootprint
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmingPurge, setConfirmingPurge] = React.useState(false)
  const [typed, setTyped] = React.useState('')
  const [confirmingRemove, setConfirmingRemove] = React.useState(false)
  const [released, setReleased] = React.useState<number | null>(null)

  const archived = person.deleted_at !== null
  const total =
    footprint.assignments +
    footprint.completedTasks +
    footprint.stays +
    footprint.timeOff +
    footprint.skills +
    footprint.privateNotes

  async function setDisabled(next: boolean) {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: updateError } = await supabase
      .from('people')
      .update({ is_active: !next })
      .eq('id', person.id)

    setPending(false)
    if (updateError) {
      setError(`Could not do that: ${updateError.message}`)
      return
    }
    router.refresh()
  }

  async function removeFromFarm() {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { data, error: rpcError } = await supabase.rpc('remove_person_from_farm', {
      p_person_id: person.id,
    })

    setPending(false)
    if (rpcError) {
      setError(`Could not remove them: ${rpcError.message}`)
      return
    }

    setReleased(typeof data === 'number' ? data : 0)
    router.refresh()
  }

  async function setArchived(next: boolean) {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: updateError } = await supabase
      .from('people')
      .update({
        deleted_at: next ? new Date().toISOString() : null,
        // Someone archived is not on the farm; someone restored is presumed
        // back. Both are editable afterwards.
        is_active: !next,
      })
      .eq('id', person.id)

    setPending(false)

    if (updateError) {
      setError(`Could not do that: ${updateError.message}`)
      return
    }

    router.refresh()
  }

  async function purge() {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()

    // Private notes first, through the function that removes without reading
    // them. Deleting the person would cascade them away anyway, but going
    // through the proper door keeps that intent explicit.
    await supabase.rpc('admin_delete_private_notes', { p_person_id: person.id })

    const { error: deleteError } = await supabase.from('people').delete().eq('id', person.id)

    if (deleteError) {
      setPending(false)
      setError(`Could not delete: ${deleteError.message}`)
      return
    }

    window.location.replace(`${TODOTWO_BASE}/people`)
  }

  return (
    <div className="flex flex-col gap-4">
      {!archived ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--tt-rule)] p-4">
          <p className="text-[13px] font-medium">
            {person.is_active ? 'Disable' : 'Disabled'}
          </p>
          <p className="text-[13px] text-[var(--tt-ink-2)]">
            {person.is_active
              ? 'Keeps them on the roster but out of rotas and assignment. For someone off sick or away for a while, who is coming back.'
              : 'They are on the roster but not being given work. Nothing else has changed.'}
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setDisabled(person.is_active)}
            className="self-start"
          >
            {person.is_active ? 'Disable' : 'Enable again'}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-[var(--tt-rule)] p-4">
        <p className="text-[13px] font-medium">
          {archived ? 'Removed from the farm' : 'Remove from the farm'}
        </p>
        <p className="text-[13px] text-[var(--tt-ink-2)]">
          {archived
            ? 'They are out of every list and rota, and their upcoming work went back to the pool. Everything they did is still here.'
            : 'For someone who has gone home. They leave every list and rota, and any work still ahead of them goes back to the pool so somebody else can pick it up. Everything they already did stays.'}
        </p>

        {released !== null ? (
          <p className="text-[13px] text-[var(--tt-accent)]">
            {released === 0
              ? 'Done. They had nothing upcoming to release.'
              : `Done. ${released} upcoming task${released === 1 ? '' : 's'} went back to the pool.`}
          </p>
        ) : null}

        {archived ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setArchived(false)}
            className="self-start"
          >
            Bring them back
          </Button>
        ) : confirmingRemove ? (
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={removeFromFarm}>
              {pending ? 'Removing …' : 'Yes, remove them'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmingRemove(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setConfirmingRemove(true)}
            className="self-start"
          >
            Remove from the farm
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-[var(--tt-danger)] p-4">
        <p className="text-[13px] font-medium text-[var(--tt-danger)]">Delete permanently</p>

        {total === 0 ? (
          <p className="text-[13px] text-[var(--tt-ink-2)]">
            Nothing is attached to them yet, so there is nothing to lose. Safe for a duplicate or a
            test entry.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-[var(--tt-ink-2)]">
              This cannot be undone, and it does not only remove the person. It would also delete:
            </p>
            <ul className="list-disc pl-5 text-[13px] text-[var(--tt-ink-2)]">
              {footprint.assignments > 0 ? <li>{footprint.assignments} assignment(s)</li> : null}
              {footprint.stays > 0 ? <li>{footprint.stays} stay(s)</li> : null}
              {footprint.timeOff > 0 ? <li>{footprint.timeOff} time-off request(s)</li> : null}
              {footprint.skills > 0 ? <li>{footprint.skills} recorded skill(s)</li> : null}
              {footprint.privateNotes > 0 ? (
                <li>{footprint.privateNotes} private note(s)</li>
              ) : null}
              {footprint.completedTasks > 0 ? (
                <li>
                  and {footprint.completedTasks} completed task(s) would stay, but stop saying who
                  did them
                </li>
              ) : null}
            </ul>
            <p className="text-[13px] text-[var(--tt-ink-2)]">
              Archiving keeps all of that. Only delete a duplicate or a mistake.
            </p>
          </>
        )}

        {confirmingPurge ? (
          <div className="flex flex-col gap-2">
            <label className="text-[13px]">
              Type <strong>{person.full_name}</strong> to confirm
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[15px]"
                autoComplete="off"
              />
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pending || typed.trim() !== person.full_name}
                onClick={purge}
              >
                {pending ? 'Deleting …' : 'Delete permanently'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setConfirmingPurge(false)
                  setTyped('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirmingPurge(true)}
            className="self-start text-[var(--tt-danger)]"
          >
            Delete permanently
          </Button>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
