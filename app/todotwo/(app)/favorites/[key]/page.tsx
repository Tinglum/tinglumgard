import { notFound } from 'next/navigation'

import { TaskRow } from '@/components/todotwo/tasks/task-row'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getFavoriteViewTasks, type FavoriteViewKey } from '@/lib/todotwo/queries'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

const LABELS: Record<FavoriteViewKey, string> = {
  overdue: 'Overdue Tasks',
  'assigned-today': 'Assigned tasks due today',
  'assigned-tomorrow': 'Assigned tasks due tomorrow',
  'unassigned-next-7': 'Unassigned tasks due next 7 days',
  'assigned-next-7': 'Assigned tasks due next 7 days',
  'farm-wide': "Tinglum Farm's assignments",
}

const VALID_KEYS = new Set(Object.keys(LABELS))

export default async function FavoriteViewPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  if (!VALID_KEYS.has(key)) notFound()

  const principal = await requireTodoTwoUser(todoTwoRoutes.favorites(key))
  const viewKey = key as FavoriteViewKey
  const isStaff = principal.isAdmin || principal.roles.includes('coordinator')

  if (viewKey === 'farm-wide' && !isStaff) {
    // Matches the staff-only convention used elsewhere for everyone's-work
    // visibility. Non-staff simply don't get this one view.
    notFound()
  }

  const tasks = await getFavoriteViewTasks(viewKey, principal.person.id, isStaff)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">{LABELS[viewKey]}</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {tasks.length === 0 ? 'Nothing here.' : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
        </p>
      </header>

      {tasks.length === 0 ? (
        <EmptyState title="All clear" description="Nothing matches this view right now." />
      ) : (
        <Surface className="px-4">
          <ul className="list-none">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} timeLabel={null} />
            ))}
          </ul>
        </Surface>
      )}
    </div>
  )
}
