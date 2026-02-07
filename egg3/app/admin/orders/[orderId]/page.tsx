import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminActionItem } from '@/components/admin/AdminActionItem'
import { adminInventory, adminOrders } from '@/lib/admin-mock-data'
import { formatLongDate } from '@/lib/admin-utils'
import { getAdminMode } from '../../admin-mode'

interface OrderDetailPageProps {
  params: { orderId: string }
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const order = adminOrders.find((item) => item.id === params.orderId)

  if (!order) {
    notFound()
  }

  const adminMode = getAdminMode()
  const inventory = adminInventory.find(
    (item) =>
      item.productName === order.productName &&
      item.windowLabel === order.windowLabel
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Order
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 font-mono tabular-nums">
          {order.orderNumber}
        </h1>
        <div className="mt-2">
          <Link
            href="/admin/orders"
            className="rounded-sm px-1 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 focus-ring"
          >
            Back to orders
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-sm border border-neutral-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Order summary
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  {order.productName}
                </div>
                <div className="text-xs text-neutral-600">
                  {order.windowLabel}
                </div>
              </div>
              <div className="text-sm text-neutral-700">
                <span className="font-mono tabular-nums">{order.quantity}</span>{' '}
                {order.unitLabel} - {order.deliveryMethod}
              </div>
              {adminMode === 'combined' && (
                <div className="text-sm text-neutral-700">
                  Product type: {order.productType === 'eggs' ? 'Eggs' : 'Pig box'}
                </div>
              )}
              <div className="text-sm text-neutral-700">
                Status: {order.status.replace('_', ' ')}
              </div>
              <div className="text-sm text-neutral-700">
                Delivery: {formatLongDate(order.deliveryDate)}
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-neutral-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Payment status
            </div>
            <div className="mt-2 space-y-2 text-sm text-neutral-700">
              <div>Deposit: {order.depositStatus}</div>
              {order.remainderDueDate ? (
                <div>
                  Remainder due: {formatLongDate(order.remainderDueDate)} (
                  {order.remainderDueInDays} days)
                </div>
              ) : (
                <div>Remainder: settled</div>
              )}
            </div>
          </section>

          <section className="rounded-sm border border-neutral-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Delivery details
            </div>
            <div className="mt-2 space-y-2 text-sm text-neutral-700">
              <div>Method: {order.deliveryMethod}</div>
              <div>Customer: {order.customerName}</div>
              <div>Email: {order.customerEmail}</div>
            </div>
          </section>

          <section className="rounded-sm border border-neutral-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Inventory impact
            </div>
            {inventory ? (
              <div className="mt-2 grid gap-3 text-sm text-neutral-700 sm:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    Capacity
                  </div>
                  <div className="font-mono tabular-nums">
                    {inventory.capacity}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    Allocated
                  </div>
                  <div className="font-mono tabular-nums">
                    {inventory.allocated}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    Remaining
                  </div>
                  <div className="font-mono tabular-nums">
                    {inventory.remaining}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-neutral-600">
                Inventory window not found.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Admin actions
          </div>
          <AdminActionItem
            title="Mark as preparing"
            description="Move order to preparation queue."
            primaryLabel="Mark preparing"
            requireConfirm
          />
          <AdminActionItem
            title="Mark as shipped"
            description="Set shipping status and notify customer."
            primaryLabel="Mark shipped"
            requireConfirm
          />
          <AdminActionItem
            title="Cancel order"
            description="Requires reason and confirmation."
            primaryLabel="Cancel order"
            danger
            requireReason
            requireConfirm
          />
          <AdminActionItem
            title="Force forfeit"
            description="Release inventory and void order."
            primaryLabel="Force forfeit"
            danger
            requireReason
            requireConfirm
          />
        </aside>
      </div>
    </div>
  )
}
