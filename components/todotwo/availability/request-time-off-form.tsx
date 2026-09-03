'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { TIME_OFF_KINDS, validateTimeOffRange, TimeOffValidationError } from '@/lib/todotwo/domain/availability'
import { farmToday } from '@/lib/todotwo/time'

const KIND_LABEL: Record<string, string> = {
  day_off: 'Day off',
  appointment: 'Appointment',
  trip: 'Trip',
  illness: 'Illness',
  partial_day: 'Partial day',
}

/**
 * A Workawayer requesting time off for themselves. Writes directly through the
 * RLS client — time_off_requests_insert_own only lets a row land with the
 * caller's own person_id and status 'pending', so there is nothing this form
 * could submit that would grant itself approval.
 */
export function RequestTimeOffForm() {
  const router = useRouter()
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [kind, setKind] = React.useState('day_off')
  const [reason, setReason] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!startDate) {
      setError('Enter a start date.')
      return
    }
    const end = endDate || startDate

    try {
      validateTimeOffRange({ start: startDate, end }, farmToday())
    } catch (err) {
      if (err instanceof TimeOffValidationError) {
        setError(err.message)
        return
      }
      throw err
    }

    setPending(true)
    try {
      const supabase = getTodoTwoBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You need to be signed in.')
        return
      }

      const { data: person, error: personError } = await supabase
        .from('people')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (personError || !person) {
        setError('Could not find your person record.')
        return
      }

      const { error: insertError } = await supabase.from('time_off_requests').insert({
        person_id: person.id as string,
        start_date: startDate,
        end_date: end,
        kind,
        reason: reason.trim() || null,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setStartDate('')
      setEndDate('')
      setReason('')
      setKind('day_off')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const field =
    'min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]'

  return (
    <Surface className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Request time off
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[13px]">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            End date (optional — same as start if blank)
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={field}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-[13px] sm:max-w-xs">
          Type
          <select value={kind} onChange={(event) => setKind(event.target.value)} className={field}>
            {TIME_OFF_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          Reason (optional)
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 py-2 text-[16px] text-[var(--tt-ink)]"
          />
        </label>

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} size="sm" className="self-start">
          {pending ? 'Sending …' : 'Send request'}
        </Button>
      </form>
    </Surface>
  )
}
