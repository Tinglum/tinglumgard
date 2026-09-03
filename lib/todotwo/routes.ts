/**
 * Every TodoTwo URL is built here. Keeping the base path in one constant means
 * moving the module (for example to /drift/todo, matching the existing Norwegian
 * operations naming) is a one-line change plus a redirect.
 */

export const TODOTWO_BASE = '/todotwo' as const
export const TODOTWO_API_BASE = '/api/todotwo' as const

export const todoTwoRoutes = {
  home: () => TODOTWO_BASE,
  today: () => TODOTWO_BASE,
  upcoming: () => `${TODOTWO_BASE}/upcoming`,
  favorites: (key?: string) => (key ? `${TODOTWO_BASE}/favorites/${key}` : `${TODOTWO_BASE}/favorites`),
  projects: () => `${TODOTWO_BASE}/projects`,
  login: () => `${TODOTWO_BASE}/login`,
  setPassword: () => `${TODOTWO_BASE}/set-password`,
  authCallback: () => `${TODOTWO_BASE}/auth/callback`,
  logout: () => `${TODOTWO_API_BASE}/auth/logout`,
} as const

/** True when the path belongs to TodoTwo, including its API surface. */
export function isTodoTwoPath(pathname: string): boolean {
  return (
    pathname === TODOTWO_BASE ||
    pathname.startsWith(`${TODOTWO_BASE}/`) ||
    pathname === TODOTWO_API_BASE ||
    pathname.startsWith(`${TODOTWO_API_BASE}/`)
  )
}

/** True for TodoTwo API routes, which answer with JSON rather than a redirect. */
export function isTodoTwoApiPath(pathname: string): boolean {
  return pathname === TODOTWO_API_BASE || pathname.startsWith(`${TODOTWO_API_BASE}/`)
}
