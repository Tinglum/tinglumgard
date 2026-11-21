import { GroceryList } from '@/components/todotwo/groceries/grocery-list'
import { EmptyState, StatusPill } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getGroceryList } from '@/lib/todotwo/queries'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function GroceriesPage() {
  await requireTodoTwoUser(`${TODOTWO_BASE}/groceries`)
  const { project, tasks, suggestions } = await getGroceryList()

  return (
    <div className="tt-fade-up mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            Shared Kitchen &amp; Barn
          </p>
          <h1 className="mt-0.5 text-[26px] leading-tight text-[var(--tt-ink)]">Grocery List</h1>
          <p className="mt-1 text-[13.5px] text-[var(--tt-ink-2)]">
            Grouped automatically by category. Tap any item to cross it off instantly.
          </p>
        </div>
        {project ? <StatusPill tone="neutral">{tasks.length} needed</StatusPill> : null}
      </header>

      {project ? (
        <GroceryList tasks={tasks} suggestions={suggestions} />
      ) : (
        <EmptyState
          title="Grocery list is being prepared"
          description="An admin needs to create the Grocery List project once."
        />
      )}
    </div>
  )
}
