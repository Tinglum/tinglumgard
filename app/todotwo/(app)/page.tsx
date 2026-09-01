import { Surface } from '@/components/todotwo/ui/states'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { FARM_TZ, farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Systemansvarlig',
  farm_admin: 'Gårdsansvarlig',
  coordinator: 'Koordinator',
  workawayer: 'Workawayer',
  applicant: 'Søker',
}

export default async function TodoTwoHomePage() {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)
  const today = farmToday()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
          {new Intl.DateTimeFormat('nb-NO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: FARM_TZ,
          }).format(new Date())}
        </p>
        <h1 className="text-2xl">Hei, {displayName(principal.person)}</h1>
      </header>

      <Surface className="p-5">
        <h2 className="text-sm font-semibold">Kontoen din</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-[var(--tt-ink-3)]">Navn</dt>
          <dd>{principal.person.fullName}</dd>

          <dt className="text-[var(--tt-ink-3)]">E-post</dt>
          <dd>{principal.email ?? principal.person.email ?? '—'}</dd>

          <dt className="text-[var(--tt-ink-3)]">Roller</dt>
          <dd>
            {principal.roles.length > 0
              ? principal.roles.map((role) => ROLE_LABELS[role] ?? role).join(', ')
              : 'Ingen roller tildelt'}
          </dd>

          <dt className="text-[var(--tt-ink-3)]">Gårdsdato</dt>
          <dd className="tabular-nums">
            {today} <span className="text-[var(--tt-ink-3)]">({FARM_TZ})</span>
          </dd>
        </dl>
      </Surface>

      <Surface className="p-5">
        <h2 className="text-sm font-semibold">Fase 0 er fullført</h2>
        <p className="mt-2 text-sm text-[var(--tt-ink-2)]">
          Grunnmuren står: innlogging, database-skjema, tilgangsregler, tester og av/på-bryter.
          Oppgavesystemet kommer i fase 1 og erstatter denne siden.
        </p>
      </Surface>
    </div>
  )
}
