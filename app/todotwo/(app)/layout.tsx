import { AppBadge } from '@/components/todotwo/pwa/app-badge'
import { ConnectionBanner } from '@/components/todotwo/pwa/connection-banner'
import { TodoTwoShell } from '@/components/todotwo/shell/app-shell'
import { OverdueCheck } from '@/components/todotwo/tasks/overdue-check'
import { UnclaimedNudge } from '@/components/todotwo/tasks/unclaimed-nudge'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getEndOfDayNudge, getOverduePrompt } from '@/lib/todotwo/queries-nudge'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

// Reads cookies to resolve the session, so this subtree is always dynamic.
export const dynamic = 'force-dynamic'

/**
 * Everything behind authentication. The login screen sits outside this group,
 * which is why it can be reached without a session.
 *
 * The connection banner is above the shell rather than inside it: when the data
 * on screen is a saved copy, that has to be the first thing read, before the
 * navigation and before the first task.
 *
 * The two evening questions live here rather than on Today because they have
 * to catch somebody entering the app at all, not somebody who happens to land
 * on one screen. Both return nothing before their hour and nothing once
 * answered, so for most of the day this is two cheap queries that render null.
 *
 * Both are timed in Europe/Oslo, not off the server clock, which is UTC on
 * Netlify. They are checked at render rather than scheduled, so unlike the
 * cron jobs they do not drift by an hour at the clock change.
 *
 * Only one is ever shown. From 23:00 they overlap, and stacking two modals on
 * top of each other would get both dismissed unread. Your own late work comes
 * first: it is the question only you can answer.
 */
export default async function TodoTwoAppLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)

  const [overdueTasks, nudgeTasks] = await Promise.all([
    getOverduePrompt(principal.person.id),
    getEndOfDayNudge(principal.person.id),
  ])

  return (
    <>
      <ConnectionBanner />
      <AppBadge />
      {overdueTasks.length > 0 ? (
        <OverdueCheck tasks={overdueTasks} />
      ) : (
        <UnclaimedNudge tasks={nudgeTasks} />
      )}
      <TodoTwoShell personName={displayName(principal.person)} roles={principal.roles}>
        {children}
      </TodoTwoShell>
    </>
  )
}
