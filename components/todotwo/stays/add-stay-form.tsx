'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { DATE_CERTAINTY_LABEL, type DateCertainty } from '@/lib/todotwo/domain/stays'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export interface StayPersonOption {
  id: string
  label: string
}

const CERTAINTIES = Object.keys(DATE_CERTAINTY_LABEL) as DateCertainty[]

const field =
  'min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]'

/**
 * Records a new visit for a person who already has a `people` row. Adding the
 * person themselves happens on the People page — this form only opens a stay.
 */
export function AddStayForm({ people }: { people: StayPersonOption[] }) {
  const router = useRouter()
  const [personId, setPersonId] = React.useState(people[0]?.id ?? '')
  const [arrivalDate, setArrivalDate] = React.useState('')
  const [arrivalCertainty, setArrivalCertainty] = React.useState<DateCertainty>('provisional')
  const [departureDate, setDepartureDate] = React.useState('')
  const [departureCertainty, setDepartureCertainty] = React.useState<DateCertainty>('provisional')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!personId) {
      setError('Choose who is arriving.')
      return
    }
    if (!arrivalDate) {
      setError('Enter an arrival date.')
      return
    }
    if (departureDate && departureDate < arrivalDate) {
      setError('Departure cannot be before arrival.')
      return
    }

    setPending(true)
    try {
      const supabase = getTodoTwoBrowserClient()

      const { error: insertError } = await supabase.from('stays').insert({
        person_id: personId,
        arrival_date: arrivalDate,
        arrival_certainty: arrivalCertainty,
        departure_date: departureDate || null,
        departure_certainty: departureDate ? departureCertainty : null,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setArrivalDate('')
      setDepartureDate('')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Surface className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Add a stay
        </p>

        <label className="flex flex-col gap-1 text-[13px]">
          Who
          <select
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
            className={field}
          >
            {people.length === 0 ? <option value="">No one on file yet</option> : null}
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[13px]">
            Arrival
            <input
              type="date"
              value={arrivalDate}
              onChange={(event) => setArrivalDate(event.target.value)}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Arrival certainty
            <select
              value={arrivalCertainty}
              onChange={(event) => setArrivalCertainty(event.target.value as DateCertainty)}
              className={field}
            >
              {CERTAINTIES.map((c) => (
                <option key={c} value={c}>
                  {DATE_CERTAINTY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Departure (optional)
            <input
              type="date"
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Departure certainty
            <select
              value={departureCertainty}
              onChange={(event) => setDepartureCertainty(event.target.value as DateCertainty)}
              disabled={!departureDate}
              className={field}
            >
              {CERTAINTIES.map((c) => (
                <option key={c} value={c}>
                  {DATE_CERTAINTY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending || people.length === 0} size="sm" className="self-start">
          {pending ? 'Saving …' : 'Add stay'}
        </Button>
      </form>
    </Surface>
  )
}
