import Link from 'next/link'
import { notFound } from 'next/navigation'
import { adminCustomers, adminOrders } from '@/lib/admin-mock-data'
import { filterByAdminMode, formatLongDate } from '@/lib/admin-utils'
import { getAdminMode } from '../../admin-mode'

interface CustomerDetailPageProps {
  params: { customerId: string }
}

export default function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const customer = adminCustomers.find((item) => item.id === params.customerId)

  if (!customer) {
    notFound()
  }

  const adminMode = getAdminMode()
  const relevantOrders = filterByAdminMode(adminOrders, adminMode)
  const customerOrders = relevantOrders.filter(
    (order) => order.customerEmail === customer.email
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Customer
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          {customer.name}
        </h1>
        <div className="mt-2">
          <Link
            href="/admin/customers"
            className="rounded-sm px-1 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 focus-ring"
          >
            Back to customers
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Contact
          </div>
          <div className="mt-2 space-y-2 text-sm text-neutral-700">
            <div>Email: {customer.email}</div>
            <div>Phone: {customer.phone}</div>
            <div>Status: {customer.status}</div>
          </div>
        </section>

        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Activity
          </div>
          <div className="mt-2 text-sm text-neutral-700">
            Orders: <span className="font-mono">{customer.ordersCount}</span>
          </div>
          <div className="text-sm text-neutral-700">
            Last order: {formatLongDate(customer.lastOrderDate)}
          </div>
        </section>
      </div>

      <section className="rounded-sm border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">
          Orders
        </div>
        <div className="divide-y divide-neutral-200">
          {customerOrders.length === 0 ? (
            <div className="px-4 py-4 text-sm text-neutral-600">
              No orders in the current admin mode.
            </div>
          ) : (
            customerOrders.map((order) => (
              <div key={order.id} className="px-4 py-4">
                <div className="text-sm font-medium text-neutral-900">
                  {order.orderNumber} - {order.productName}
                </div>
                <div className="text-xs text-neutral-600">
                  {order.windowLabel} - {formatLongDate(order.deliveryDate)} -{' '}
                  <span className="font-mono tabular-nums">
                    {order.quantity}
                  </span>{' '}
                  {order.unitLabel}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
