'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { cn } from '@/lib/utils'
import { todoTwoRoutes } from '@/lib/todotwo/routes'
import type { TodoTwoRole } from '@/lib/todotwo/auth'
import { IMPLEMENTED_HREFS, navItemsForRoles } from '@/components/todotwo/shell/navigation'

/**
 * Mobile: bottom tab bar, thumb-reachable.
 * Desktop: left sidebar.
 *
 * The storefront's Header and Footer are deliberately not reused — TodoTwo is
 * an operational tool, not a page of the public site.
 */
export function TodoTwoShell({
  personName,
  roles,
  children,
}: {
  personName: string
  roles: TodoTwoRole[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const items = navItemsForRoles(roles).filter((item) => IMPLEMENTED_HREFS.has(item.href))
  const primary = items.filter((item) => item.primary)

  return (
    <div className="flex min-h-[100svh] flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--tt-rule)] bg-[var(--tt-surface)] md:flex">
        <div className="border-b border-[var(--tt-rule)] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            Tinglumgård
          </p>
          <p className="mt-1 text-lg font-semibold">TodoTwo</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main menu">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[var(--tt-accent-soft)] font-medium text-[var(--tt-ink)]'
                    : 'text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)]'
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--tt-rule)] p-3">
          <p className="px-3 pb-2 text-sm font-medium">{personName}</p>
          <form action={todoTwoRoutes.logout()} method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--tt-ink-2)] transition-colors hover:bg-[var(--tt-surface-2)]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--tt-rule)] bg-[var(--tt-surface)] px-4 py-3 md:hidden">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
              Tinglumgård
            </p>
            <p className="text-base font-semibold">TodoTwo</p>
          </div>
          <form action={todoTwoRoutes.logout()} method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--tt-ink-2)]"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>

        {primary.length > 1 ? (
          <nav
            aria-label="Main menu"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--tt-rule)] bg-[var(--tt-surface)] md:hidden"
          >
            {primary.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px]',
                    active ? 'text-[var(--tt-accent)]' : 'text-[var(--tt-ink-3)]'
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        ) : null}
      </div>
    </div>
  )
}
