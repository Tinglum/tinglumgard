'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * Sets a person's first day on the farm.
 *
 * This is the field the onboarding ramp runs on, and until now nothing wrote
 * it — the ramp cron reads `people.farm_start_date`, finds it null for
 * everyone, and does nothing, which is why the shadowing days and the
 * two-task handover have never once happened for anybody.
 *
 * Admin-only: `people_admin_all` is the only write policy on the table, so a
 * coordinator would get an RLS refusal. The control is hidden rather than
 * shown-and-failing.
 */
export function FirstDayControl({
  personId,
  value,
  canEdit,
}: {
  personId: string
  value: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [date, setDate] = React.useState(value ?? '')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!canEdit) {
    return value ? (
      <span className="text-[12px] text-[var(--tt-ink-3)]">First day {value}</span>
    ) : null
  }

  async function save(next: string) {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: updateError } = await supabase
      .from('people')
      .update({ farm_start_date: next || null })
      .eq('id', personId)

    setPending(false)

    if (updateError) {
      setError('Could not save that.')
      setDate(value ?? '')
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <label className="flex items-center gap-1.5 text-[12px] text-[var(--tt-ink-3)]">
        First day
        <input
          type="date"
          value={date}
          disabled={pending}
          onChange={(event) => {
            setDate(event.target.value)
            void save(event.target.value)
          }}
          className="min-h-[32px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
        />
      </label>
      {error ? <span className="text-[11px] text-[var(--tt-danger)]">{error}</span> : null}
    </div>
  )
}
