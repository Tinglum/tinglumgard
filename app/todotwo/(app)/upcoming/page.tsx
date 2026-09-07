import { PersonalUpcomingPager } from '@/components/todotwo/tasks/personal-upcoming-pager'
import { UpcomingTaskFilter } from '@/components/todotwo/tasks/upcoming-task-filter'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import Link from 'next/link'

import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getFavoriteViews, getUpcoming } from '@/lib/todotwo/queries'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function UpcomingPage() {
  const principal = await requireTodoTwoUser(todoTwoRoutes.upcoming())
  const isStaff = principal.isAdmin || principal.roles.includes('coordinator')
  const [groups, favorites] = await Promise.all([
    getUpcoming(7),
    getFavoriteViews(principal.person.id, isStaff),
  ])

  const visibleGroups = groups.map((group, index) => ({
    ...group,
    // The automatic rota covers four upcoming days. Later generated
    // occurrences are preparation data, not actionable work yet.
    tasks: group.tasks.filter((task) => Boolean(task.assignee) || index < 4),
  }))
  const total = visibleGroups.reduce((sum, g) => sum + g.tasks.length, 0)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Upcoming</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {total === 0 ? 'Nothing scheduled this week.' : `${total} over the next 7 days`}
        </p>
      </header>

      <PersonalUpcomingPager groups={visibleGroups} personId={principal.person.id} />

      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Favorites
        </h2>
        <Surface className="px-4">
          <ul className="list-none divide-y divide-[var(--tt-line)]">
            {favorites.map((view) => (
              <li key={view.key}>
                <Link
                  href={todoTwoRoutes.favorites(view.key)}
                  className="flex items-center justify-between py-2 text-sm hover:text-[var(--tt-accent)]"
                >
                  <span>{view.label}</span>
                  <span className="text-[var(--tt-ink-3)]">{view.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      <UpcomingTaskFilter groups={visibleGroups} personId={principal.person.id} />

      {total === 0 ? (
        <EmptyState title="Nothing ahead" description="Generated routines will appear here." />
      ) : null}
    </div>
  )
}
