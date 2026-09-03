import { AssignmentConsole } from '@/components/todotwo/assign/assignment-console'
import { requireRole } from '@/lib/todotwo/auth'
import { addFarmDays, farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function AssignPage() {
  await requireRole(['super_admin', 'farm_admin', 'coordinator'], `${TODOTWO_BASE}/routines/assign`)

  const today = farmToday()
  const defaultFrom = today
  const defaultTo = addFarmDays(today, 6)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Assign with free text</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Describe how to split the open work — "divide all tasks evenly, but Robert does no
          housekeeping tasks" — and check the result before anything is written.
        </p>
      </header>

      <AssignmentConsole defaultFrom={defaultFrom} defaultTo={defaultTo} />
    </div>
  )
}
