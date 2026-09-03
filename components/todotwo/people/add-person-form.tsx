'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

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
      }

      setName('')
      setEmail('')
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
