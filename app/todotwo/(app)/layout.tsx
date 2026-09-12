import { AppBadge } from '@/components/todotwo/pwa/app-badge'
import { ConnectionBanner } from '@/components/todotwo/pwa/connection-banner'
import { TodoTwoShell } from '@/components/todotwo/shell/app-shell'
import { UnclaimedNudge } from '@/components/todotwo/tasks/unclaimed-nudge'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getEndOfDayNudge } from '@/lib/todotwo/queries-nudge'
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
 * The end-of-day question lives here rather than on Today because it has to
 * catch somebody entering the app at all, not somebody who happens to land on
 * one screen. It returns nothing before 23:00 and nothing once answered, so
 * for most of the day this costs one cheap query and renders null.
 */
export default async function TodoTwoAppLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)
  const nudgeTasks = await getEndOfDayNudge(principal.person.id)

  return (
    <>
      <ConnectionBanner />
      <AppBadge />
      <UnclaimedNudge tasks={nudgeTasks} />
      <TodoTwoShell personName={displayName(principal.person)} roles={principal.roles}>
        {children}
      </TodoTwoShell>
    </>
  )
}
