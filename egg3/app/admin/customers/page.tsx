import Link from 'next/link'
import { adminCustomers, adminOrders } from '@/lib/admin-mock-data'
import { filterByAdminMode, formatLongDate } from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

export default function AdminCustomersPage() {
  const adminMode = getAdminMode()
  const relevantOrders = filterByAdminMode(adminOrders, adminMode)
  const relevantEmails = new Set(relevantOrders.map((order) => order.customerEmail))
  const customers = adminCustomers.filter((customer) =>
    relevantEmails.has(customer.email)
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Customers
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Customer records
        </h1>
      </div>

      <div className="rounded-sm border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">
          Active customers
        </div>
        <div className="divide-y divide-neutral-200">
          {customers.length === 0 ? (
            <div className="px-4 py-4 text-sm text-neutral-600">
              No customers in the current admin mode.
            </div>
          ) : (
            customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="block px-4 py-4 transition-colors duration-150 hover:bg-neutral-50 focus-ring"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      {customer.name}
                    </div>
                    <div className="text-xs text-neutral-600">
                      {customer.email} - {customer.phone}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    Last order {formatLongDate(customer.lastOrderDate)}
                  </div>
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  Orders:{' '}
                  <span className="font-mono tabular-nums">
                    {customer.ordersCount}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
