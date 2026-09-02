import { Surface } from '@/components/todotwo/ui/states'
import { copy, format, UI_LOCALE } from '@/lib/todotwo/copy'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { FARM_TZ, farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function TodoTwoHomePage() {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)
  const today = farmToday()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
          {new Intl.DateTimeFormat(UI_LOCALE, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: FARM_TZ,
          }).format(new Date())}
        </p>
        <h1 className="text-2xl">
          {format(copy.overview.greeting, { name: displayName(principal.person) })}
        </h1>
      </header>

      <Surface className="p-5">
        <h2 className="text-sm font-semibold">{copy.overview.accountTitle}</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-[var(--tt-ink-3)]">{copy.overview.name}</dt>
          <dd>{principal.person.fullName}</dd>

          <dt className="text-[var(--tt-ink-3)]">{copy.overview.email}</dt>
          <dd>{principal.email ?? principal.person.email ?? '—'}</dd>

          <dt className="text-[var(--tt-ink-3)]">{copy.overview.rolesLabel}</dt>
          <dd>
            {principal.roles.length > 0
              ? principal.roles.map((role) => copy.roles[role] ?? role).join(', ')
              : copy.overview.noRoles}
          </dd>

          <dt className="text-[var(--tt-ink-3)]">{copy.overview.farmDate}</dt>
          <dd className="tabular-nums">
            {today} <span className="text-[var(--tt-ink-3)]">({FARM_TZ})</span>
          </dd>
        </dl>
      </Surface>

      <Surface className="p-5">
        <h2 className="text-sm font-semibold">Phase 0 complete</h2>
        <p className="mt-2 text-sm text-[var(--tt-ink-2)]">
          The foundation is in place: sign-in, database schema, access rules, tests and the on/off
          switch. The task system arrives in Phase 1 and replaces this page.
        </p>
      </Surface>
    </div>
  )
}
