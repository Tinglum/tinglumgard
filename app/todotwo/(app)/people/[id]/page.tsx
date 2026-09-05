import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EditPersonForm } from '@/components/todotwo/people/edit-person-form'
import { RemovePerson } from '@/components/todotwo/people/remove-person'
import { Avatar } from '@/components/todotwo/ui/avatar'
import { Surface } from '@/components/todotwo/ui/states'
import { copy } from '@/lib/todotwo/copy'
import { requireRole } from '@/lib/todotwo/auth'
import { getPerson, getPersonFootprint } from '@/lib/todotwo/queries-person'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const metadata: Metadata = { title: 'Person' }
export const dynamic = 'force-dynamic'

/**
 * One person: what is true about them, and the three different things
 * "remove" can mean.
 *
 * Reachable by clicking a name, which was not possible before — the people
 * list was a dead end, so a typo in an email could not be corrected by
 * anyone.
 */
export default async function PersonPage({ params }: { params: { id: string } }) {
  const principal = await requireRole(
    ['super_admin', 'farm_admin', 'coordinator'],
    `${TODOTWO_BASE}/people`
  )

  const person = await getPerson(params.id)
  if (!person) notFound()

  // people_admin_all is the only write policy on the table: a coordinator can
  // look, an administrator can change.
  const canEdit = principal.isAdmin
  const footprint = canEdit ? await getPersonFootprint(person.id) : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`${TODOTWO_BASE}/people`}
          className="text-[13px] text-[var(--tt-ink-3)] underline-offset-4 hover:underline"
        >
          ← Everyone
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <Avatar
          person={{
            id: person.id,
            fullName: person.full_name,
            preferredName: person.preferred_name,
            photoUrl: person.photo_url,
          }}
          size={44}
        />
        <div className="min-w-0">
          <h1 className="text-2xl">{person.preferred_name || person.full_name}</h1>
          <p className="text-sm text-[var(--tt-ink-2)]">
            {person.email ?? 'No email — cannot sign in'}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {person.roles.map((role) => (
          <span
            key={role}
            className="rounded bg-[var(--tt-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--tt-accent)]"
          >
            {copy.roles[role] ?? role}
          </span>
        ))}
        {person.deleted_at ? (
          <span className="rounded bg-[var(--tt-surface-2)] px-2 py-0.5 text-[11px] text-[var(--tt-ink-3)]">
            Removed from the farm
          </span>
        ) : !person.is_active ? (
          <span className="rounded bg-[var(--tt-surface-2)] px-2 py-0.5 text-[11px] text-[var(--tt-ink-3)]">
            Disabled
          </span>
        ) : null}
        {person.auth_user_id ? null : (
          <span className="rounded bg-[var(--tt-surface-2)] px-2 py-0.5 text-[11px] text-[var(--tt-ink-3)]">
            Not signed in yet
          </span>
        )}
      </div>

      {canEdit ? (
        <>
          <Surface className="p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
              Details
            </p>
            <EditPersonForm person={person} />
          </Surface>

          <section className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
              Leaving
            </p>
            <RemovePerson person={person} footprint={footprint!} />
          </section>
        </>
      ) : (
        <p className="text-[13px] text-[var(--tt-ink-2)]">
          Only an administrator can change or remove someone.
        </p>
      )}
    </div>
  )
}
