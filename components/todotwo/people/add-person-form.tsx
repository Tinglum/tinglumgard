'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { DATE_CERTAINTY_LABEL, type DateCertainty } from '@/lib/todotwo/domain/stays'

/**
 * Adds a person, and with them the ability to sign in.
 *
 * No auth user is created here — that needs the service-role key, which is
 * banned from request paths. The person row waits; Supabase creates the account
 * when they first sign in, and claim_person links the two.
 */
export function AddPersonForm() {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState('workawayer')
  const [addStay, setAddStay] = React.useState(false)
  const [arrivalDate, setArrivalDate] = React.useState('')
  const [arrivalCertainty, setArrivalCertainty] = React.useState('provisional')
  const [departureDate, setDepartureDate] = React.useState('')
  const [departureCertainty, setDepartureCertainty] = React.useState('provisional')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Enter a name.')
      return
    }
    if (!email.trim()) {
      setError('Enter an email address, or they cannot sign in.')
      return
    }
    if (addStay && !arrivalDate) {
      setError('Enter an arrival date, or turn off "Add a stay".')
      return
    }
    if (addStay && departureDate && departureDate < arrivalDate) {
      setError('Departure cannot be before arrival.')
      return
    }

    setPending(true)
    try {
      const supabase = getTodoTwoBrowserClient()

      const { data: person, error: insertError } = await supabase
        .from('people')
        .insert({ full_name: name.trim(), email: email.trim().toLowerCase() })
        .select('id')
        .single()

      if (insertError) {
        setError(
          insertError.code === '23505'
            ? 'Someone with that email is already here.'
            : insertError.message
        )
        return
      }

      if (person) {
        const { error: roleError } = await supabase
          .from('role_assignments')
          .insert({ person_id: person.id as string, role })

        if (roleError) {
          setError(`Added, but the role did not stick: ${roleError.message}`)
          return
        }

        if (addStay) {
          const { error: stayError } = await supabase.from('stays').insert({
            person_id: person.id as string,
            arrival_date: arrivalDate,
            arrival_certainty: arrivalCertainty,
            departure_date: departureDate || null,
            departure_certainty: departureDate ? departureCertainty : null,
          })

          if (stayError) {
            setError(`Added, but the stay did not save: ${stayError.message}`)
            return
          }
        }
      }

      setName('')
      setEmail('')
      setAddStay(false)
      setArrivalDate('')
      setDepartureDate('')
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
          Add someone
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[13px]">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={field}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              className={field}
              autoComplete="off"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-[13px] sm:max-w-xs">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={field}
          >
            <option value="workawayer">Workawayer</option>
            <option value="coordinator">Coordinator</option>
            <option value="farm_admin">Farm administrator</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={addStay}
            onChange={(event) => setAddStay(event.target.checked)}
            className="h-4 w-4"
          />
          Add a stay (arrival / departure)
        </label>

        {addStay ? (
          <div className="grid gap-3 rounded-md border border-[var(--tt-rule)] p-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[13px]">
              Arrival date
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
                onChange={(event) => setArrivalCertainty(event.target.value)}
                className={field}
              >
                {(Object.keys(DATE_CERTAINTY_LABEL) as DateCertainty[]).map((c) => (
                  <option key={c} value={c}>
                    {DATE_CERTAINTY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[13px]">
              Departure date (optional)
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
                onChange={(event) => setDepartureCertainty(event.target.value)}
                disabled={!departureDate}
                className={field}
              >
                {(Object.keys(DATE_CERTAINTY_LABEL) as DateCertainty[]).map((c) => (
                  <option key={c} value={c}>
                    {DATE_CERTAINTY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} size="sm" className="self-start">
          {pending ? 'Adding …' : 'Add person'}
        </Button>
      </form>
    </Surface>
  )
}
