'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { findConflictingAssignment } from '@/lib/todotwo/domain/stays'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { AccommodationRow, StayRow } from '@/lib/todotwo/queries'

const field =
  'min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]'

/**
 * The Postgres error code an EXCLUDE constraint raises. Distinct from unique
 * violations (23505) so the message can name the actual rule.
 */
const EXCLUSION_VIOLATION = '23P01'

export interface StayOption extends Pick<StayRow, 'id' | 'person_id' | 'full_name' | 'preferred_name'> {}

/**
 * Books a stay into an accommodation for a date range.
 *
 * A conflict is checked client-side first, for a friendly message before the
 * round trip — but the database's EXCLUDE constraint is what actually stops a
 * double booking, including one from two coordinators submitting at once. When
 * that constraint fires, Postgres returns 23P01 and this form shows it as the
 * same "already booked" message rather than a raw SQL error.
 */
export function AssignBedForm({
  accommodations,
  stays,
}: {
  accommodations: AccommodationRow[]
  stays: StayOption[]
}) {
  const router = useRouter()
  const [accommodationId, setAccommodationId] = React.useState(accommodations[0]?.id ?? '')
  const [stayId, setStayId] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [existing, setExisting] = React.useState<
    { id: string; start_date: string; end_date: string | null }[]
  >([])

  React.useEffect(() => {
    let cancelled = false
    if (!accommodationId) {
      setExisting([])
      return
    }
    const supabase = getTodoTwoBrowserClient()
    supabase
      .from('accommodation_assignments')
      .select('id, start_date, end_date')
      .eq('accommodation_id', accommodationId)
      .then((result: { data: { id: string; start_date: string; end_date: string | null }[] | null }) => {
        const { data } = result
        if (!cancelled) {
          setExisting(
            (data ?? []) as unknown as { id: string; start_date: string; end_date: string | null }[]
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [accommodationId])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!accommodationId) {
      setError('Choose an accommodation.')
      return
    }
    if (!stayId) {
      setError('Choose who is being assigned.')
      return
    }
    if (!startDate) {
      setError('Enter a start date.')
      return
    }
    if (endDate && endDate < startDate) {
      setError('End date cannot be before start date.')
      return
    }

    const conflict = findConflictingAssignment(
      { startDate, endDate: endDate || null },
      existing.map((e) => ({ startDate: e.start_date, endDate: e.end_date }))
    )
    if (conflict) {
      setError(
        `Already booked ${conflict.startDate} – ${conflict.endDate ?? 'open-ended'}. Choose another accommodation or date range.`
      )
      return
    }

    const stay = stays.find((s) => s.id === stayId)
    if (!stay) {
      setError('Could not find that stay.')
      return
    }

    setPending(true)
    try {
      const supabase = getTodoTwoBrowserClient()

      const { error: insertError } = await supabase.from('accommodation_assignments').insert({
        accommodation_id: accommodationId,
        stay_id: stay.id,
        person_id: stay.person_id,
        start_date: startDate,
        end_date: endDate || null,
      })

      if (insertError) {
        setError(
          insertError.code === EXCLUSION_VIOLATION
            ? 'That accommodation is already booked for an overlapping date range.'
            : insertError.message
        )
        return
      }

      setStartDate('')
      setEndDate('')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Surface className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Assign a bed
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[13px]">
            Accommodation
            <select
              value={accommodationId}
              onChange={(event) => setAccommodationId(event.target.value)}
              className={field}
            >
              {accommodations.length === 0 ? <option value="">None set up yet</option> : null}
              {accommodations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Who
            <select value={stayId} onChange={(event) => setStayId(event.target.value)} className={field}>
              <option value="">Choose …</option>
              {stays.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.preferred_name || s.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            From
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            To (optional)
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={field}
            />
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending || accommodations.length === 0 || stays.length === 0}
          size="sm"
          className="self-start"
        >
          {pending ? 'Booking …' : 'Assign'}
        </Button>
      </form>
    </Surface>
  )
}
