import {
  AdminMode,
  AdminProductType,
  AdminScheduleWindow,
  AdminStatus,
} from './admin-types'

export const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/schedule', label: 'Schedule' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/activity', label: 'Activity log' },
  { href: '/admin/settings', label: 'Settings' },
]

export const ADMIN_MODE_OPTIONS: Array<{ value: AdminMode; label: string }> = [
  { value: 'eggs', label: 'Eggs' },
  { value: 'pigs', label: 'Pigs' },
  { value: 'combined', label: 'Combined' },
]

export function normalizeAdminMode(value: string | undefined): AdminMode {
  if (value === 'eggs' || value === 'pigs' || value === 'combined') {
    return value
  }
  return 'combined'
}

export function filterByAdminMode<T extends { productType: AdminProductType }>(
  items: T[],
  mode: AdminMode
): T[] {
  if (mode === 'combined') {
    return items
  }
  if (mode === 'eggs') {
    return items.filter((item) => item.productType === 'eggs')
  }
  return items.filter((item) => item.productType === 'pig_box')
}

export function filterScheduleWindows(
  windows: AdminScheduleWindow[],
  mode: AdminMode
): AdminScheduleWindow[] {
  return windows
    .map((window) => ({
      ...window,
      entries: filterByAdminMode(window.entries, mode),
    }))
    .filter((window) => window.entries.length > 0)
}

export function formatCompactDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('nb-NO', {
    maximumFractionDigits: 0,
  })} kr`
}

export function getStatusLabel(status: AdminStatus): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'closed':
      return 'Closed'
    case 'locked':
      return 'Locked'
    case 'sold_out':
      return 'Sold out'
    default:
      return status
  }
}

export function getStatusTone(status: AdminStatus): string {
  switch (status) {
    case 'open':
      return 'badge-neutral'
    case 'closed':
      return 'badge-warning'
    case 'locked':
      return 'badge-error'
    case 'sold_out':
      return 'badge-error'
    default:
      return 'badge-neutral'
  }
}

export function getCapacityPercent(allocated: number, capacity: number): number {
  if (capacity <= 0) return 0
  return Math.min(100, Math.round((allocated / capacity) * 100))
}
