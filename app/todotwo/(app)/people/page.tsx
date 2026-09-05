import Link from 'next/link'

import { AddPersonForm } from '@/components/todotwo/people/add-person-form'
import { FirstDayControl } from '@/components/todotwo/people/first-day-control'
import { Surface } from '@/components/todotwo/ui/states'
import { requireRole } from '@/lib/todotwo/auth'
import { getPeople } from '@/lib/todotwo/queries'
import { copy } from '@/lib/todotwo/copy'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  const principal = await requireRole(
    ['super_admin', 'farm_admin', 'coordinator'],
    `${TODOTWO_BASE}/people`
  )
  const people = await getPeople()
  // people_admin_all is the only write policy on the table, so a coordinator
  // can read this page but not change anyone on it.
  const canEdit = principal.isAdmin

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">People</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {people.length} on the farm. Adding an email lets that person sign in — their account is
          created the first time they do.
        </p>
        <p className="flex gap-3 text-[13px]">
          <Link href={`${TODOTWO_BASE}/stays`} className="text-[var(--tt-accent)] underline-offset-4 hover:underline">
            Stays &amp; arrivals
          </Link>
          <Link
            href={`${TODOTWO_BASE}/accommodation`}
            className="text-[var(--tt-accent)] underline-offset-4 hover:underline"
          >
            Accommodation
          </Link>
        </p>
      </header>

      <AddPersonForm />

      <Surface className="px-4">
        <ul className="list-none">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[15px]">{person.preferred_name || person.full_name}</p>
                <p className="truncate text-[13px] text-[var(--tt-ink-3)]">
                  {person.email ?? 'No email — cannot sign in'}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {person.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded bg-[var(--tt-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--tt-accent)]"
                  >
                    {copy.roles[role] ?? role}
                  </span>
                ))}

                <FirstDayControl
                  personId={person.id}
                  value={person.farm_start_date}
                  canEdit={canEdit}
                />

                {person.auth_user_id ? null : (
                  <span className="rounded bg-[var(--tt-surface-2)] px-2 py-0.5 text-[11px] text-[var(--tt-ink-3)]">
                    Not signed in yet
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  )
}
