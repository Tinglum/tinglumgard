import {
  Award,
  Bell,
  BookOpen,
  BedDouble,
  Building2,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  FolderKanban,
  ShoppingBasket,
  Home,
  Handshake,
  Megaphone,
  Menu,
  Settings,
  UsersRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import type { TodoTwoRole } from '@/lib/todotwo/auth'

export type NavGroup = 'daily' | 'farm' | 'team'

/**
 * One navigation source for both the mobile tab bar and the desktop sidebar.
 * `roles: null` means every signed-in person sees it.
 */
export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: TodoTwoRole[] | null
  /** Shown in the mobile tab bar. Keep this to four. */
  primary: boolean
  group: NavGroup
}

export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'farm', label: 'Farm & Planning' },
  { key: 'team', label: 'People & Settings' },
]

export const NAV_ITEMS: NavItem[] = [
  // Daily
  {
    href: TODOTWO_BASE,
    label: 'Today',
    icon: Home,
    roles: null,
    primary: true,
    group: 'daily',
  },
  {
    href: `${TODOTWO_BASE}/upcoming`,
    label: 'Week plan',
    icon: CalendarRange,
    roles: null,
    primary: true,
    group: 'daily',
  },
  {
    href: `${TODOTWO_BASE}/roster`,
    label: 'Roster',
    icon: UsersRound,
    roles: null,
    primary: true,
    group: 'daily',
  },
  {
    href: `${TODOTWO_BASE}/notifications`,
    label: 'Notifications',
    icon: Bell,
    roles: null,
    primary: false,
    group: 'daily',
  },

  // Farm & Planning
  {
    href: `${TODOTWO_BASE}/projects`,
    label: 'Projects',
    icon: FolderKanban,
    roles: null,
    primary: false,
    group: 'farm',
  },
  {
    href: `${TODOTWO_BASE}/routines`,
    label: 'Routines',
    icon: CalendarDays,
    roles: null,
    primary: false,
    group: 'farm',
  },
  {
    href: `${TODOTWO_BASE}/swaps`,
    label: 'Task swaps',
    icon: Handshake,
    roles: null,
    primary: false,
    group: 'farm',
  },
  {
    href: `${TODOTWO_BASE}/groceries`,
    label: 'Groceries',
    icon: ShoppingBasket,
    roles: null,
    primary: false,
    group: 'farm',
  },
  {
    href: `${TODOTWO_BASE}/recipes`,
    label: 'Recipes',
    icon: BookOpen,
    roles: null,
    primary: false,
    group: 'farm',
  },
  {
    href: `${TODOTWO_BASE}/announcements`,
    label: 'Notices',
    icon: Megaphone,
    roles: null,
    primary: false,
    group: 'farm',
  },

  // People & Settings
  {
    href: `${TODOTWO_BASE}/availability`,
    label: 'Time off',
    icon: CalendarOff,
    roles: null,
    primary: false,
    group: 'team',
  },
  {
    href: `${TODOTWO_BASE}/skills`,
    label: 'Skills',
    icon: Award,
    roles: null,
    primary: false,
    group: 'team',
  },
  {
    href: `${TODOTWO_BASE}/people`,
    label: 'People',
    icon: Users,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: false,
    group: 'team',
  },
  {
    href: `${TODOTWO_BASE}/stays`,
    label: 'Stays',
    icon: BedDouble,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: false,
    group: 'team',
  },
  {
    href: `${TODOTWO_BASE}/accommodation`,
    label: 'Accommodation',
    icon: Building2,
    roles: ['super_admin', 'farm_admin', 'coordinator'],
    primary: false,
    group: 'team',
  },
  {
    href: `${TODOTWO_BASE}/settings`,
    label: 'Settings',
    icon: Settings,
    roles: null,
    primary: false,
    group: 'team',
  },
  {
    href: `${TODOTWO_BASE}/more`,
    label: 'More',
    icon: Menu,
    roles: null,
    primary: true,
    group: 'team',
  },
]

export function navItemsForRoles(roles: TodoTwoRole[]): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles === null || item.roles.some((r) => roles.includes(r)))
}

export const IMPLEMENTED_HREFS = new Set<string>([
  `${TODOTWO_BASE}/recipes`,
  TODOTWO_BASE,
  `${TODOTWO_BASE}/upcoming`,
  `${TODOTWO_BASE}/notifications`,
  `${TODOTWO_BASE}/groceries`,
  `${TODOTWO_BASE}/roster`,
  `${TODOTWO_BASE}/swaps`,
  `${TODOTWO_BASE}/people`,
  `${TODOTWO_BASE}/routines`,
  `${TODOTWO_BASE}/projects`,
  `${TODOTWO_BASE}/announcements`,
  `${TODOTWO_BASE}/stays`,
  `${TODOTWO_BASE}/accommodation`,
  `${TODOTWO_BASE}/availability`,
  `${TODOTWO_BASE}/skills`,
  `${TODOTWO_BASE}/settings`,
  `${TODOTWO_BASE}/more`,
])
