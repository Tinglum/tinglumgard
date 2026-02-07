import { adminPayments } from '@/lib/admin-mock-data'
import { filterByAdminMode, formatCurrency } from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

export default function AdminPaymentsPage() {
  const adminMode = getAdminMode()
  const payments = filterByAdminMode(adminPayments, adminMode)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Payments
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Read-only ledger
        </h1>
      </div>

      <div className="rounded-sm border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Filters
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
            {['Deposit pending', 'Remainder pending', 'Failed', 'Refunded'].map(
              (label) => (
                <span
                  key={label}
                  className="rounded-sm border border-neutral-200 px-3 py-1"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>

        <div className="divide-y divide-neutral-200">
          {payments.length === 0 ? (
            <div className="px-4 py-4 text-sm text-neutral-600">
              No payments in the current admin mode.
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="px-4 py-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div>
                  <div className="text-sm font-medium text-neutral-900">
                    {payment.provider} - {payment.paymentType}
                  </div>
                  <div className="text-xs text-neutral-600">
                    <span className="font-mono tabular-nums">
                      {payment.orderNumber}
                    </span>{' '}
                    -{' '}
                    <span className="font-mono tabular-nums">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {adminMode === 'combined' && (
                      <span>
                        Product:{' '}
                        {payment.productType === 'eggs' ? 'Eggs' : 'Pig box'} -{' '}
                      </span>
                    )}
                    Status: {payment.status}
                    {payment.isTest ? ' (TEST)' : ' (PROD)'}
                  </div>
                  </div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    {formatDateTime(payment.createdAt)}
                  </div>
                </div>
                <details className="mt-3 text-xs text-neutral-600">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Webhook payload
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-sm border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-700">
                    {payment.payloadPreview}
                  </pre>
                </details>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
