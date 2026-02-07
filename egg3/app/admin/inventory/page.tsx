import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge'
import { adminInventory } from '@/lib/admin-mock-data'
import { filterByAdminMode, formatLongDate } from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

export default function AdminInventoryPage() {
  const adminMode = getAdminMode()
  const inventory = filterByAdminMode(adminInventory, adminMode)

  const formatProductLabel = (productType: string, name: string) => {
    if (adminMode !== 'combined') return name
    return `${productType === 'eggs' ? 'Eggs' : 'Pig box'} - ${name}`
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Inventory
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Capacity and allocation
        </h1>
      </div>

      <div className="rounded-sm border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">
          Inventory windows
        </div>
        <div className="divide-y divide-neutral-200">
          {inventory.length === 0 ? (
            <div className="px-4 py-4 text-sm text-neutral-600">
              No inventory windows in the current admin mode.
            </div>
          ) : (
            inventory.map((item) => (
              <div key={item.id} className="px-4 py-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      {formatProductLabel(item.productType, item.productName)}
                    </div>
                    <div className="text-xs text-neutral-600">
                      {item.windowLabel} - {formatLongDate(item.windowDate)}
                    </div>
                  </div>
                  <div className="text-sm font-mono tabular-nums text-neutral-700">
                    Cap {item.capacity}
                  </div>
                  <div className="text-sm font-mono tabular-nums text-neutral-700">
                    Alloc {item.allocated}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono tabular-nums text-neutral-700">
                      Rem {item.remaining}
                    </div>
                    <AdminStatusBadge status={item.status} />
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
