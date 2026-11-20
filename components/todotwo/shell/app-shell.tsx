'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, LogOut, Sprout } from 'lucide-react'

import { cn } from '@/lib/utils'
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'
import type { TodoTwoRole } from '@/lib/todotwo/auth'
import {
  IMPLEMENTED_HREFS,
  NAV_GROUPS,
  navItemsForRoles,
} from '@/components/todotwo/shell/navigation'
import { QuickAdd } from '@/components/todotwo/quick-add/quick-add'

const QUICK_ADD_ROLES: TodoTwoRole[] = ['super_admin', 'farm_admin', 'coordinator']

/**
 * Mobile: sticky frosted top bar + thumb-reachable bottom dock.
 * Desktop: grouped left sidebar with subtle elevation and instant route feedback.
 */
export function TodoTwoShell({
  personName,
  roles,
  impersonatorName,
  children,
}: {
  personName: string
  roles: TodoTwoRole[]
  impersonatorName: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [navigating, setNavigating] = React.useState(false)

  React.useEffect(() => setNavigating(false), [pathname])

  React.useEffect(() => {
    function noticeNavigation(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor || event.defaultPrevented || event.button !== 0 || anchor.target === '_blank') {
        return
      }
      const url = new URL(anchor.href, window.location.href)
      if (
        url.origin === window.location.origin &&
        url.pathname.startsWith('/todotwo') &&
        url.pathname !== window.location.pathname
      ) {
        setNavigating(true)
      }
    }
    document.addEventListener('click', noticeNavigation, true)
    return () => document.removeEventListener('click', noticeNavigation, true)
  }, [])

  const items = navItemsForRoles(roles).filter((item) => IMPLEMENTED_HREFS.has(item.href))
  const primary = items.filter((item) => item.primary)
  const desktopItems = items.filter((item) => item.href !== todoTwoRoutes.more())

  const initial = personName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="flex min-h-[100svh] flex-col md:flex-row">
      {navigating ? (
        <div
          className="fixed inset-x-0 top-0 z-[100] h-[2.5px] overflow-hidden bg-[var(--tt-accent-soft)]"
          role="status"
          aria-label="Loading page"
        >
          <span className="tt-nav-bar block h-full w-2/5 rounded-full bg-[var(--tt-accent)]" />
        </div>
      ) : null}

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--tt-rule)] bg-[var(--tt-surface)] md:sticky md:top-0 md:flex md:h-[100svh]">
        <div className="flex items-center gap-3 border-b border-[var(--tt-rule)] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--tt-accent)] text-[var(--tt-on-accent)] shadow-[var(--tt-shadow-xs)]">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tt-accent)]">
              Tinglumgård
            </p>
            <p className="text-[16px] font-semibold leading-tight text-[var(--tt-ink)]">TodoTwo</p>
          </div>
        </div>

        <nav
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4"
          aria-label="Main menu"
        >
          {NAV_GROUPS.map((group) => {
            const groupItems = desktopItems.filter((item) => item.group === group.key)
            if (groupItems.length === 0) return null
            return (
              <div key={group.key} className="flex flex-col gap-0.5">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
                  {group.label}
                </p>
                {groupItems.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition-colors',
                        active
                          ? 'bg-[var(--tt-accent-soft)] font-semibold text-[var(--tt-accent)]'
                          : 'font-medium text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)] hover:text-[var(--tt-ink)]'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-[17px] w-[17px] shrink-0',
                          active ? 'text-[var(--tt-accent)]' : 'text-[var(--tt-ink-3)]'
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-[var(--tt-rule)] p-3">
          <div className="flex items-center gap-2.5 px-2 pb-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tt-accent-soft)] text-[13px] font-semibold text-[var(--tt-accent)]">
              {initial}
            </span>
            <p className="truncate text-[13.5px] font-medium text-[var(--tt-ink)]">{personName}</p>
          </div>
          <form action={todoTwoRoutes.logout()} method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[var(--tt-ink-2)] transition-colors hover:bg-[var(--tt-surface-2)] hover:text-[var(--tt-ink)]"
            >
              <LogOut className="h-4 w-4 text-[var(--tt-ink-3)]" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {impersonatorName ? (
          <div className="flex items-center justify-center gap-3 border-b border-[var(--tt-accent-ring)] bg-[var(--tt-accent-soft)] px-4 py-2 text-[13px]">
            <span>
              Viewing as <strong>{personName}</strong>
            </span>
            <form action={todoTwoRoutes.stopImpersonating()} method="post">
              <button
                type="submit"
                className="font-semibold text-[var(--tt-accent)] underline underline-offset-2"
              >
                Return to {impersonatorName}
              </button>
            </form>
          </div>
        ) : null}

        {/* Mobile Sticky Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--tt-rule)] bg-[var(--tt-surface)]/90 px-4 py-2.5 backdrop-blur-md md:hidden">
          <Link href={todoTwoRoutes.home()} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--tt-accent)] text-[var(--tt-on-accent)] shadow-[var(--tt-shadow-xs)]">
              <Sprout className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tt-accent)] leading-none">
                Tinglumgård
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-none text-[var(--tt-ink)]">
                TodoTwo
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href={`${TODOTWO_BASE}/notifications`}
              aria-label="Notifications"
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                pathname === `${TODOTWO_BASE}/notifications`
                  ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]'
                  : 'text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)]'
              )}
            >
              <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
            </Link>
            <form action={todoTwoRoutes.logout()} method="post">
              <button
                type="submit"
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--tt-ink-2)] transition-colors hover:bg-[var(--tt-surface-2)]"
              >
                <LogOut className="h-[19px] w-[19px]" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-7">
          {children}
        </main>

        {/* Mobile Bottom Dock */}
        {primary.length > 1 ? (
          <nav
            aria-label="Main menu"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--tt-rule)] bg-[var(--tt-surface)]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md md:hidden"
          >
            {primary.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium transition-colors',
                    active ? 'text-[var(--tt-accent)]' : 'text-[var(--tt-ink-3)]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      active && 'bg-[var(--tt-accent-soft)]'
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        ) : null}

        <QuickAdd canManageAll={roles.some((role) => QUICK_ADD_ROLES.includes(role))} />
      </div>
    </div>
  )
}
