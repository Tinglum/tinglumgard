import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { cache } from 'react'

import { getTodoTwoAuthClient, getTodoTwoClient } from '@/lib/todotwo/db'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const TODOTWO_ROLES = [
  'super_admin',
  'farm_admin',
  'coordinator',
  'workawayer',
  'applicant',
] as const

export type TodoTwoRole = (typeof TODOTWO_ROLES)[number]

export interface TodoTwoPerson {
  id: string
  fullName: string
  preferredName: string | null
  email: string | null
  photoUrl: string | null
}

export interface TodoTwoPrincipal {
  authUserId: string
  email: string | null
  person: TodoTwoPerson
  roles: TodoTwoRole[]
  isAdmin: boolean
}

const ADMIN_ROLES: TodoTwoRole[] = ['super_admin', 'farm_admin']

/**
 * Was this a real "you are not signed in", or just a bad moment?
 *
 * Supabase answers both with an error object, and the difference matters more
 * than it looks. A rejected token means sign in again. A timeout, a 5xx, or a
 * refresh that lost a race with the one middleware just did means *try again* —
 * and if we mistake the second for the first we sign somebody out for having a
 * weak signal. On a farm, that is most of the day.
 */
function isRejection(error: { status?: number; message?: string } | null): boolean {
  if (!error) return false
  // 401/403 is the auth server saying no. 400 is a malformed or spent token.
  if (typeof error.status === 'number') return error.status >= 400 && error.status < 500
  return /jwt|token|session|not authenticated/i.test(error.message ?? '')
}

/**
 * The signed-in TodoTwo principal, or null.
 *
 * Two round trips by design: the Supabase session establishes identity, then
 * the person row and roles are read through the RLS client so a caller can only
 * ever resolve to a person they are entitled to see — their own.
 *
 * The retry is not defensive padding. Token rotation is on, and the refresh
 * that middleware performs at the edge and the render that happens in a
 * (possibly cold-starting) function are far enough apart that the render can
 * arrive holding the previous token. One retry, after the cookie has caught up,
 * turns that into a non-event instead of a logout.
 */
const PERSON_SELECT =
  'id, full_name, preferred_name, email, photo_url, role_assignments!role_assignments_person_id_fkey(role, revoked_at)'

function personQuery(db: ReturnType<typeof getTodoTwoClient>, authUserId: string) {
  return db
    .from('people')
    .select(PERSON_SELECT)
    .eq('auth_user_id', authUserId)
    .is('deleted_at', null)
    .is('role_assignments.revoked_at', null)
    .maybeSingle()
}

export const getTodoTwoUser = cache(async function getTodoTwoUser(): Promise<TodoTwoPrincipal | null> {
  const authClient = getTodoTwoAuthClient()
  const db = getTodoTwoClient()

  // Both of these used to be awaited one after the other, and both cross the
  // Atlantic: the functions run in us-east-1 and the database is in
  // eu-central-1, so two sequential calls is most of the wait before an
  // authenticated page renders at all.
  //
  // getSession() reads the cookie and touches no network, so it can name the
  // user before anybody has verified anything. That is enough to *start* the
  // person lookup, which then runs alongside the verification rather than
  // behind it.
  //
  // It is not enough to trust. The result is used only if getUser() then
  // confirms the same user, and the query itself carries the caller's JWT, so
  // PostgREST verifies the signature and RLS applies exactly as before. A
  // forged or expired cookie buys a wasted query and nothing else.
  const {
    data: { session },
  } = await authClient.auth.getSession()

  const claimedId = session?.user?.id ?? null

  const [userResult, speculative] = await Promise.all([
    authClient.auth.getUser(),
    claimedId ? personQuery(db, claimedId) : Promise.resolve(null),
  ])

  let { data: { user }, error } = userResult

  if (error && !isRejection(error)) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    ;({ data: { user }, error } = await authClient.auth.getUser())
  }

  if (error || !user) return null

  // The speculative row counts only when it is genuinely this user's. Any
  // mismatch — no cookie, a stale one, a refresh mid-flight — falls back to
  // the ordinary sequential lookup.
  const personResult =
    speculative && claimedId === user.id ? speculative : await personQuery(db, user.id)

  const { data: person, error: personError } = personResult

  if (personError || !person) return null

  const roles = ((person.role_assignments ?? []) as { role: TodoTwoRole }[]).map((row) => row.role)

  return {
    authUserId: user.id,
    email: user.email ?? null,
    person: {
      id: person.id as string,
      fullName: person.full_name as string,
      preferredName: (person.preferred_name as string | null) ?? null,
      email: (person.email as string | null) ?? null,
      photoUrl: (person.photo_url as string | null) ?? null,
    },
    roles,
    isAdmin: roles.some((role) => ADMIN_ROLES.includes(role)),
  }
})

/** For pages. Redirects to the login screen when unauthenticated. */
export async function requireTodoTwoUser(returnTo?: string): Promise<TodoTwoPrincipal> {
  const principal = await getTodoTwoUser()
  if (principal) return principal

  const target = returnTo
    ? `${todoTwoRoutes.login()}?returnTo=${encodeURIComponent(returnTo)}`
    : todoTwoRoutes.login()

  redirect(target)
}

/** For pages. Redirects when the role is absent. */
export async function requireRole(
  role: TodoTwoRole | TodoTwoRole[],
  returnTo?: string
): Promise<TodoTwoPrincipal> {
  const principal = await requireTodoTwoUser(returnTo)
  const wanted = Array.isArray(role) ? role : [role]

  if (!principal.roles.some((held) => wanted.includes(held))) {
    redirect(todoTwoRoutes.home())
  }

  return principal
}

export type ApiAuthResult =
  | { ok: true; principal: TodoTwoPrincipal }
  | { ok: false; response: NextResponse }

/** For route handlers. Answers with JSON rather than redirecting. */
export async function requireTodoTwoApiUser(): Promise<ApiAuthResult> {
  const principal = await getTodoTwoUser()

  if (!principal) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'unauthenticated', message: 'You need to be signed in.' },
        { status: 401 }
      ),
    }
  }

  return { ok: true, principal }
}

/** For route handlers. 403 when the role is absent. */
export async function requireApiRole(role: TodoTwoRole | TodoTwoRole[]): Promise<ApiAuthResult> {
  const result = await requireTodoTwoApiUser()
  if (!result.ok) return result

  const wanted = Array.isArray(role) ? role : [role]
  if (!result.principal.roles.some((held) => wanted.includes(held))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'forbidden', message: 'You do not have access to this.' },
        { status: 403 }
      ),
    }
  }

  return result
}

export function displayName(person: TodoTwoPerson): string {
  return person.preferredName?.trim() || person.fullName
}
