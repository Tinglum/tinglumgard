import Link from 'next/link'
import { adminOrders } from '@/lib/admin-mock-data'
import { filterByAdminMode, formatLongDate } from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

export default function AdminOrdersPage() {
  const adminMode = getAdminMode()
  const orders = filterByAdminMode(adminOrders, adminMode)
    .filter((order) => order.status !== 'delivered' && order.status !== 'cancelled')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime())

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Orders
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Order resolution
        </h1>
      </div>

      <div className="rounded-sm border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Default filters
            </div>
            <div className="text-sm font-semibold text-neutral-900">
              Status not delivered or cancelled
            </div>
          </div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Sorted by delivery date
          </div>
        </div>

        <div className="divide-y divide-neutral-200">
          {orders.length === 0 ? (
            <div className="px-4 py-4 text-sm text-neutral-600">
              No orders in the current admin mode.
            </div>
          ) : (
            orders.map((order) => {
              const paymentLine =
                order.status === 'deposit_paid' && order.remainderDueInDays
                  ? `Deposit paid - remainder due in ${order.remainderDueInDays} days`
                  : order.status === 'fully_paid'
                  ? 'Fully paid'
                  : order.status.replace('_', ' ')

              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block px-4 py-4 transition-colors duration-150 hover:bg-neutral-50 focus-ring"
                >
                  <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center">
                    <div className="text-sm font-semibold text-neutral-900 font-mono tabular-nums">
                      {order.orderNumber}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">
                        {adminMode === 'combined'
                          ? `${
                              order.productType === 'eggs' ? 'Eggs' : 'Pig box'
                            } - ${order.productName}`
                          : order.productName}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {order.windowLabel} -{' '}
                        <span className="font-mono tabular-nums">
                          {order.quantity}
                        </span>{' '}
                        {order.unitLabel} - {order.deliveryMethod}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {paymentLine}
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-wider text-neutral-500">
                      {formatLongDate(order.deliveryDate)}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
