import { ScheduleRow } from '@/components/admin/ScheduleRow'
import { adminScheduleWindows } from '@/lib/admin-mock-data'
import { filterScheduleWindows, formatLongDate } from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

export default function AdminSchedulePage() {
  const adminMode = getAdminMode()
  const windows = filterScheduleWindows(adminScheduleWindows, adminMode)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Schedule
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Delivery windows
        </h1>
      </div>

      <div className="space-y-6">
        {windows.length === 0 ? (
          <div className="rounded-sm border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-600">
            No schedule windows in the current admin mode.
          </div>
        ) : (
          windows.map((window) => {
            const windowLabel = `Week ${window.weekNumber}`
            return (
              <section
                key={window.id}
                className="rounded-sm border border-neutral-200 bg-white"
              >
                <div className="border-b border-neutral-200 px-4 py-3">
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    {windowLabel}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {formatLongDate(window.startDate)}
                  </div>
                </div>
                <div className="divide-y divide-neutral-200">
                  {window.entries.map((entry) => (
                    <ScheduleRow
                      key={entry.id}
                      windowLabel={windowLabel}
                      windowDate={window.startDate}
                      entry={entry}
                      productLabel={
                        adminMode === 'combined'
                          ? `${
                              entry.productType === 'eggs' ? 'Eggs' : 'Pig box'
                            } - ${entry.productName}`
                          : entry.productName
                      }
                    />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
