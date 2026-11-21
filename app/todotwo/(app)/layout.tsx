import * as React from 'react'

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
 * Evening prompts stream in separately inside <Suspense> so they never add a
 * sequential round trip before the main page renders.
 */
async function EveningPrompts({ personId }: { personId: string }) {
  const [overdueTasks, nudgeTasks] = await Promise.all([
    getOverduePrompt(personId),
    getEndOfDayNudge(personId),
  ])

  if (overdueTasks.length > 0) {
    return <OverdueCheck tasks={overdueTasks} />
  }
  if (nudgeTasks.length > 0) {
    return <UnclaimedNudge tasks={nudgeTasks} />
  }
  return null
}

/**
 * Everything behind authentication. The login screen sits outside this group,
 * which is why it can be reached without a session.
 */
export default async function TodoTwoAppLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)

  return (
    <>
      <ConnectionBanner />
      <AppBadge />
      <React.Suspense fallback={null}>
        <EveningPrompts personId={principal.person.id} />
      </React.Suspense>
      <TodoTwoShell
        personName={displayName(principal.person)}
        roles={principal.roles}
        impersonatorName={principal.impersonator ? displayName(principal.impersonator) : null}
      >
        {children}
      </TodoTwoShell>
    </>
  )
}
