'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export interface RotaPerson {
  id: string
  name: string
}

/**
 * Who does this routine, and in what order.
 *
 * Rotation is by position through the list, walked in date order — not by
 * "person index = day number". That means adding a weekday, skipping a day or
 * reordering the rota does not shift everyone's turn for the rest of the year.
 *
 * Applying only fills occurrences nobody has been put against by hand, so a
 * deliberate swap survives the next run.
 */
export function RotaEditor({
  seriesId,
  people,
  rota: initialRota,
  upcomingCount,
}: {
  seriesId: string
  people: RotaPerson[]
  rota: RotaPerson[]
  upcomingCount: number
}) {
  const router = useRouter()
  const [rota, setRota] = React.useState(initialRota)
  const [pending, setPending] = React.useState(false)
  const [applied, setApplied] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const inRota = new Set(rota.map((p) => p.id))
  const available = people.filter((p) => !inRota.has(p.id))

  async function persist(next: RotaPerson[]) {
    setPending(true)
    setError(null)
    setApplied(null)

    const supabase = getTodoTwoBrowserClient()

    // Replace wholesale: positions are contiguous, so patching individual rows
    // risks a gap or a duplicate position mid-edit.
    const { error: deleteError } = await supabase
      .from('series_rota')
      .delete()
      .eq('series_id', seriesId)

    if (deleteError) {
      setError(deleteError.message)
      setPending(false)
      return
    }

    if (next.length > 0) {
      const { error: insertError } = await supabase.from('series_rota').insert(
        next.map((person, index) => ({
          series_id: seriesId,
          person_id: person.id,
          position: index,
        }))
      )

      if (insertError) {
        setError(insertError.message)
        setPending(false)
        return
      }
    }

    setRota(next)
    setPending(false)
    router.refresh()
  }

  async function apply() {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { data, error: rpcError } = await supabase.rpc('apply_rota', {
        p_series_id: seriesId,
      })

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      setApplied(typeof data === 'number' ? data : 0)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
        Rota
      </p>

      {rota.length === 0 ? (
        <p className="text-[13px] text-[var(--tt-ink-3)]">
          Nobody yet. Add people and they take turns, day by day.
        </p>
      ) : (
        <ol className="flex flex-wrap gap-2">
          {rota.map((person, index) => (
            <li
              key={person.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tt-accent-soft)] py-1 pl-2.5 pr-1.5 text-[13px]"
            >
              <span className="tabular-nums text-[var(--tt-ink-3)]">{index + 1}</span>
              <span>{person.name}</span>
              <button
                type="button"
                onClick={() => persist(rota.filter((p) => p.id !== person.id))}
                disabled={pending}
                aria-label={`Remove ${person.name} from the rota`}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-[var(--tt-surface-2)]"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {available.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => persist([...rota, person])}
              disabled={pending}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--tt-rule-strong)]',
                'px-2.5 py-1 text-[13px] text-[var(--tt-ink-2)] hover:border-[var(--tt-accent)]'
              )}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              {person.name}
            </button>
          ))}
        </div>
      ) : null}

      {rota.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={apply} disabled={pending}>
            {pending ? 'Working …' : `Assign the next ${upcomingCount} days`}
          </Button>

          {applied !== null ? (
            <span className="inline-flex items-center gap-1 text-[13px] text-[var(--tt-accent)]">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {applied === 0
                ? 'Nothing to assign — all already have someone.'
                : `${applied} assigned.`}
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}

      <p className="text-[12px] leading-relaxed text-[var(--tt-ink-3)]">
        People take turns in this order, day by day. Days someone has already been put against by
        hand are left alone.
      </p>
    </div>
  )
}
