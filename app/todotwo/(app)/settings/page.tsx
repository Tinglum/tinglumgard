import type { Metadata } from 'next'
import Link from 'next/link'
import { Bell, FileStack, KeyRound, LockKeyhole } from 'lucide-react'

import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/**
 * The hub the settings pages never had.
 *
 * Three of them (passkeys, notifications, templates) shipped as standalone
 * routes with nothing linking to them, and the navigation's Settings entry
 * pointed at /todotwo/innstillinger, which does not exist — so none of it was
 * reachable. Password lives here too, which is what makes "skip for now, set
 * one later in Settings" on the set-password screen an honest offer rather
 * than a dead end.
 */
export default async function TodoTwoSettingsPage() {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/settings`)
  const isStaff =
    principal.isAdmin || principal.roles.includes('coordinator')

  const items = [
    {
      href: todoTwoRoutes.setPassword(),
      label: 'Password',
      description: 'Set or change the password you sign in with.',
      icon: LockKeyhole,
      show: true,
    },
    {
      href: `${TODOTWO_BASE}/settings/passkeys`,
      label: 'Passkeys',
      description: 'Sign in with Face ID, Touch ID, or Windows Hello.',
      icon: KeyRound,
      show: true,
    },
    {
      href: `${TODOTWO_BASE}/settings/notifications`,
      label: 'Notifications',
      description: 'Get a push on this device when something needs you.',
      icon: Bell,
      show: true,
    },
    {
      href: `${TODOTWO_BASE}/settings/templates`,
      label: 'Task templates',
      description: 'Reusable checklists staff can drop onto any day.',
      icon: FileStack,
      show: isStaff,
    },
  ].filter((item) => item.show)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Settings</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          How you sign in, and what reaches you.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-4 hover:border-[var(--tt-rule-strong)]"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tt-accent)]" aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-[var(--tt-ink-2)]">{item.description}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
