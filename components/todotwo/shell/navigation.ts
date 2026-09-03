import {
  Award,
  BedDouble,
  Building2,
  CalendarDays,
  CalendarOff,
  FolderKanban,
  Home,
  ListTodo,
  Megaphone,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

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
    label: 'Today',
    icon: Home,
    roles: null,
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/upcoming`,
    label: 'Upcoming',
    icon: ListTodo,
    roles: null,
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/routines`,
    label: 'Routines',
    icon: CalendarDays,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/projects`,
    label: 'Projects',
    icon: FolderKanban,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: false,
  },
  {
    href: `${TODOTWO_BASE}/announcements`,
    label: 'Notices',
    icon: Megaphone,
    roles: null,
    primary: false,
  },
  {
    href: `${TODOTWO_BASE}/people`,
    label: 'People',
    icon: Users,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: true,
  },
  {
    href: `${TODOTWO_BASE}/stays`,
    label: 'Stays',
    icon: BedDouble,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: false,
  },
  {
    href: `${TODOTWO_BASE}/accommodation`,
    label: 'Accommodation',
    icon: Building2,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: false,
  },
  {
    href: `${TODOTWO_BASE}/availability`,
    label: 'Time off',
    icon: CalendarOff,
    // Everyone: a Workawayer requests their own; staff also see approvals here.
    roles: null,
    primary: false,
  },
  {
    href: `${TODOTWO_BASE}/skills`,
    label: 'Skills',
    icon: Award,
    // Everyone: a Workawayer claims their own; staff also verify here.
    roles: null,
    primary: false,
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
export const IMPLEMENTED_HREFS = new Set<string>([
  TODOTWO_BASE,
  `${TODOTWO_BASE}/upcoming`,
  `${TODOTWO_BASE}/people`,
  `${TODOTWO_BASE}/routines`,
  `${TODOTWO_BASE}/projects`,
  `${TODOTWO_BASE}/announcements`,
  `${TODOTWO_BASE}/stays`,
  `${TODOTWO_BASE}/accommodation`,
  `${TODOTWO_BASE}/availability`,
  `${TODOTWO_BASE}/skills`,
])
