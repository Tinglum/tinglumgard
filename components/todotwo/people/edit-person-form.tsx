'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { PersonDetail } from '@/lib/todotwo/queries-person'

const ROLES = [
  { value: 'workawayer', label: 'Workawayer' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'farm_admin', label: 'Farm administrator' },
  { value: 'super_admin', label: 'Owner' },
]

/**
 * Changing someone.
 *
 * There was no edit path at all until now: a person could be added and then
 * never corrected, so a typo in an email meant they could not sign in and
 * nobody could fix it.
 *
 * Roles are handled as revoke-and-insert against role_assignments rather than
 * an update, because that table keeps revoked_at as history — who held what,
 * when — and overwriting the row would throw that away.
 */
export function EditPersonForm({ person }: { person: PersonDetail }) {
  const router = useRouter()
  const [fullName, setFullName] = React.useState(person.full_name)
  const [preferredName, setPreferredName] = React.useState(person.preferred_name ?? '')
  const [email, setEmail] = React.useState(person.email ?? '')
  const [phone, setPhone] = React.useState(person.phone ?? '')
  const [photoUrl, setPhotoUrl] = React.useState(person.photo_url ?? '')
  const [firstDay, setFirstDay] = React.useState(person.farm_start_date ?? '')
  const [isActive, setIsActive] = React.useState(person.is_active)
  const [role, setRole] = React.useState(person.roles[0] ?? 'workawayer')

  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    if (!fullName.trim()) {
      setError('A name is required.')
      return
    }

    setPending(true)
    try {
      const supabase = getTodoTwoBrowserClient()

      const { error: updateError } = await supabase
        .from('people')
        .update({
          full_name: fullName.trim(),
          preferred_name: preferredName.trim() || null,
          email: email.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          photo_url: photoUrl.trim() || null,
          farm_start_date: firstDay || null,
          is_active: isActive,
        })
        .eq('id', person.id)

      if (updateError) {
        setError(
          updateError.code === '23505'
            ? 'Someone else already has that email.'
            : `Could not save: ${updateError.message}`
        )
        return
      }

      // Only touch roles when they actually changed, so an unrelated edit does
      // not litter the history with a revoke and a re-grant of the same role.
      if (role !== (person.roles[0] ?? 'workawayer')) {
        const { error: revokeError } = await supabase
          .from('role_assignments')
          .update({ revoked_at: new Date().toISOString() })
          .eq('person_id', person.id)
          .is('revoked_at', null)

        if (revokeError) {
          setError(`Saved, but the role did not change: ${revokeError.message}`)
          return
        }

        const { error: grantError } = await supabase
          .from('role_assignments')
          .insert({ person_id: person.id, role })

        if (grantError) {
          setError(`Saved, but the new role did not stick: ${grantError.message}`)
          return
        }
      }

      setSaved(true)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const field =
    'min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px]">
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          Goes by (optional)
          <input
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            placeholder={fullName.split(' ')[0]}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            className={field}
          />
          <span className="text-[12px] text-[var(--tt-ink-3)]">
            This is how they sign in. Changing it changes which address works.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          Phone (optional)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          Photo URL (optional)
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            type="url"
            placeholder="https://…"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          First day
          <input
            type="date"
            value={firstDay}
            onChange={(e) => setFirstDay(e.target.value)}
            className={field}
          />
          <span className="text-[12px] text-[var(--tt-ink-3)]">
            Anchors the shadowing days for a new arrival.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        On the farm right now
      </label>
      <p className="-mt-2 text-[12px] text-[var(--tt-ink-3)]">
        Turning this off leaves everything intact but takes them out of rotas and lists. It is the
        usual way to handle someone who has gone home.
      </p>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-[13px] text-[var(--tt-accent)]">Saved.</p> : null}

      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending ? 'Saving …' : 'Save changes'}
      </Button>
    </form>
  )
}
