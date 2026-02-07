import { adminActivity } from '@/lib/admin-mock-data'
import { filterByAdminMode, formatLongDate } from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

export default function AdminActivityPage() {
  const adminMode = getAdminMode()
  const activity = filterByAdminMode(adminActivity, adminMode)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Activity log
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Immutable audit trail
        </h1>
      </div>

      <div className="rounded-sm border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">
          System log
        </div>
        <div className="divide-y divide-neutral-200">
          {activity.length === 0 ? (
            <div className="px-4 py-4 text-sm text-neutral-600">
              No activity in the current admin mode.
            </div>
          ) : (
            activity.map((entry) => (
              <div key={entry.id} className="px-4 py-4">
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  {formatLongDate(entry.timestamp)} -{' '}
                  {formatTime(entry.timestamp)}
                </div>
                <div className="mt-2 grid gap-3 text-sm text-neutral-700 md:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="font-semibold text-neutral-900">
                    Admin: {entry.adminName}
                  </div>
                  <div>
                    {adminMode === 'combined' && (
                      <div>
                        Product:{' '}
                        {entry.productType === 'eggs' ? 'Eggs' : 'Pig box'}
                      </div>
                    )}
                    <div>Action: {entry.action}</div>
                    <div>Entity: {entry.entity}</div>
                    <div>Target: {entry.summary}</div>
                    <div>Changes: {entry.changes}</div>
                    <div>Reason: {entry.reason}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
