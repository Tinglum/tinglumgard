import { CalendarDays, Home, ListTodo, Settings, Users, type LucideIcon } from 'lucide-react'

import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import type { TodoTwoRole } from '@/lib/todotwo/auth'

/**
 * One navigation source for both the mobile tab bar and the desktop sidebar.
 * Later phases add entries here and both surfaces pick them up.
 *
 * `roles: null` means every signed-in person sees it.
 */
export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: TodoTwoRole[] | null
  /** Shown in the mobile tab bar. Keep this to four or fewer. */
  primary: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: TODOTWO_BASE,
    label: 'Overview',
    icon: Home,
    roles: null,
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/oppgaver`,
    label: 'Tasks',
    icon: ListTodo,
    roles: null,
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/uke`,
    label: 'Week',
    icon: CalendarDays,
    roles: null,
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/folk`,
    label: 'People',
    icon: Users,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/innstillinger`,
    label: 'Settings',
    icon: Settings,
    roles: ['super_admin', 'farm_admin'],
    primary: false,
  },
]

export function navItemsForRoles(roles: TodoTwoRole[]): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles === null || item.roles.some((r) => roles.includes(r)))
}

/**
 * Phase 0 ships only the overview. The rest are declared above so the shell is
 * built once, but they are not rendered until the phase that implements them
 * lands — a navigation item that leads nowhere is a placeholder, and Phase 0
 * forbids those.
 */
export const IMPLEMENTED_HREFS = new Set<string>([TODOTWO_BASE])
