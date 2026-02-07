import Link from 'next/link'
import { AdminMetricBar } from '@/components/admin/AdminMetricBar'
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge'
import { adminAlerts, adminScheduleWindows } from '@/lib/admin-mock-data'
import {
  filterByAdminMode,
  filterScheduleWindows,
  formatCompactDate,
} from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

export default function AdminDashboardPage() {
  const adminMode = getAdminMode()
  const windows = filterScheduleWindows(adminScheduleWindows, adminMode).slice(0, 5)
  const alerts = filterByAdminMode(adminAlerts, adminMode)

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Admin overview
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="rounded-sm border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  This week and next 4 weeks
                </div>
                <div className="text-sm font-semibold text-neutral-900">
                  Operational state
                </div>
              </div>
              <Link
                href="/admin/schedule"
                className="rounded-sm px-1 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 focus-ring"
              >
                View schedule
              </Link>
            </div>

            <div className="divide-y divide-neutral-200">
              {windows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-neutral-600">
                  No windows in the current admin mode.
                </div>
              ) : (
                windows.map((window) => (
                  <div key={window.id} className="px-4 py-4">
                    <div className="text-xs uppercase tracking-wider text-neutral-500">
                      Week {window.weekNumber} -{' '}
                      {formatCompactDate(window.startDate)}
                    </div>
                    <div className="mt-3 space-y-2">
                      {window.entries.map((entry) => (
                        <Link
                          key={entry.id}
                          href="/admin/schedule"
                          className="block rounded-sm border border-neutral-200 bg-white px-3 py-3 transition-colors duration-150 hover:bg-neutral-50 focus-ring"
                          style={{
                            borderLeftWidth: entry.accentColor ? 4 : 2,
                            borderLeftStyle: 'solid',
                            borderLeftColor: entry.accentColor ?? '#E5E7EB',
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="min-w-[140px] text-sm font-medium text-neutral-900">
                              {adminMode === 'combined'
                                ? `${
                                    entry.productType === 'eggs'
                                      ? 'Eggs'
                                      : 'Pig box'
                                  } - ${entry.productName}`
                                : entry.productName}
                            </div>
                            <AdminMetricBar
                              allocated={entry.allocated}
                              capacity={entry.capacity}
                            />
                            <div className="ml-auto">
                              <AdminStatusBadge status={entry.status} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="glass-strong rounded-sm border border-neutral-200 px-4 py-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Alerts
            </div>
            <div className="mt-1 text-sm font-semibold text-neutral-900">
              Requires attention
            </div>

            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-sm border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-600">
                  No alerts in the current admin mode.
                </div>
              ) : (
                alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className="block rounded-sm border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-800 transition-colors duration-150 hover:bg-neutral-50 focus-ring"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        !
                      </span>
                      <span>{alert.message}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
