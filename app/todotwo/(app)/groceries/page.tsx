import { GroceryList } from '@/components/todotwo/groceries/grocery-list'
import { EmptyState } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getGroceryList } from '@/lib/todotwo/queries'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function GroceriesPage() {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/groceries`)
  const { project, tasks } = await getGroceryList()
  const canAdd = principal.isAdmin || principal.roles.includes('coordinator')
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <header className="flex flex-col gap-2">
      <h1 className="text-2xl">Grocery List</h1>
      <p className="text-sm text-[var(--tt-ink-2)]">One shared shopping list, grouped automatically. Tap an item when it has been bought.</p>
    </header>
    {project ? <GroceryList tasks={tasks} projectId={project.id} canAdd={canAdd} /> : <EmptyState title="Grocery list is being prepared" description="An admin needs to create the Grocery List project once." />}
  </div>
}
