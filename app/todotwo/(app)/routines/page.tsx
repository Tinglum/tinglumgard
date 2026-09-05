import Link from 'next/link'

import { AssignmentRulesManager } from '@/components/todotwo/routines/assignment-rules-manager'
import { ClearAssignments } from '@/components/todotwo/tasks/clear-assignments'
import { RotaEditor } from '@/components/todotwo/tasks/rota-editor'
import { FeedCheckToggle } from '@/components/todotwo/tasks/feed-check-toggle'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { requireRole } from '@/lib/todotwo/auth'
import { getPeople, getSeries } from '@/lib/todotwo/queries'
import { getAssignmentRules } from '@/lib/todotwo/queries-rules'
import { describeRule } from '@/lib/todotwo/domain/recurrence'
import { farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function RoutinesPage() {
  const principal = await requireRole(
    ['super_admin', 'farm_admin', 'coordinator'],
    `${TODOTWO_BASE}/routines`
  )

  const [series, people, rules] = await Promise.all([getSeries(), getPeople(), getAssignmentRules()])
  // assignment_rules_staff_write covers coordinators too, so anyone who can
  // reach this page can change them.
  const canEditRules = principal.isAdmin || principal.roles.includes('coordinator')
  const roster = people.map((person) => ({
    id: person.id,
    name: person.preferred_name || person.full_name,
  }))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">Routines</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {series.length} recurring routines. The instructions live here once — change them and
          every future day shows the change.
        </p>
        <div className="flex gap-4">
          <Link
            href={`${TODOTWO_BASE}/routines/assign`}
            className="self-start text-[13px] font-medium text-[var(--tt-accent)] hover:underline"
          >
            Assign with free text →
          </Link>
          <Link
            href={`${TODOTWO_BASE}/routines/apply-template`}
            className="self-start text-[13px] font-medium text-[var(--tt-accent)] hover:underline"
          >
            New from template →
          </Link>
        </div>
      </header>

      <Surface className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            Rules for automatic assignment
          </p>
          <p className="text-[13px] text-[var(--tt-ink-2)]">
            The nightly round keeps the next four days assigned and follows whatever is switched on
            here. Turning one off stops it from the next run; it is kept so you can turn it back on.
          </p>
        </div>
        <AssignmentRulesManager rules={rules} canEdit={canEditRules} />
      </Surface>

      <Surface className="p-4">
        <ClearAssignments fromDate={farmToday()} />
      </Surface>

      {series.length === 0 ? (
        <EmptyState title="No routines yet" description="Import or create one to get started." />
      ) : null}

      {series.map((routine) => (
        <Surface key={routine.id} className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold leading-snug">{routine.title}</h2>
            <p className="text-[13px] text-[var(--tt-ink-3)]">
              {describeRule(routine.rrule)}
              {routine.stepCount > 0 ? ` · ${routine.stepCount} steps` : ''}
              {routine.upcomingCount > 0 ? ` · ${routine.upcomingCount} days queued` : ''}
            </p>
            {routine.description ? (
              <p className="mt-1 line-clamp-2 text-[13px] text-[var(--tt-ink-2)]">
                {routine.description}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[var(--tt-rule)] pt-4">
            <RotaEditor
              seriesId={routine.id}
              people={roster}
              rota={routine.rota}
              upcomingCount={routine.upcomingCount}
            />
          </div>

          <div className="border-t border-[var(--tt-rule)] pt-4">
            <FeedCheckToggle seriesId={routine.id} requiresFeedCheck={routine.requiresFeedCheck} />
          </div>
        </Surface>
      ))}
    </div>
  )
}
