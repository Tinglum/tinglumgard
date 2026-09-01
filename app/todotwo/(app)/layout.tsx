import { TodoTwoShell } from '@/components/todotwo/shell/app-shell'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

// Reads cookies to resolve the session, so this subtree is always dynamic.
export const dynamic = 'force-dynamic'

/**
 * Everything behind authentication. The login screen sits outside this group,
 * which is why it can be reached without a session.
 */
export default async function TodoTwoAppLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)

  return (
    <TodoTwoShell personName={displayName(principal.person)} roles={principal.roles}>
      {children}
    </TodoTwoShell>
  )
}
