import Link from 'next/link'
import { adminProducts } from '@/lib/admin-mock-data'
import { filterByAdminMode, formatCurrency } from '@/lib/admin-utils'
import { getAdminMode } from '../admin-mode'

export default function AdminProductsPage() {
  const adminMode = getAdminMode()
  const products = filterByAdminMode(adminProducts, adminMode)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Products
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Unified catalog
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {products.length === 0 ? (
          <div className="rounded-sm border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-600">
            No products in the current admin mode.
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="rounded-sm border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {product.name}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    {product.productType === 'eggs' ? 'Eggs' : 'Pig box'}
                  </div>
                </div>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="rounded-sm px-1 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 focus-ring"
                >
                  Edit
                </Link>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-neutral-700 sm:grid-cols-2">
                <div>
                  Status: {product.status === 'active' ? 'Active' : 'Inactive'}
                </div>
                <div>
                  Price:{' '}
                  <span className="font-mono tabular-nums">
                    {formatCurrency(product.pricePerUnit)}
                  </span>
                </div>
                <div>
                  Min order:{' '}
                  <span className="font-mono tabular-nums">
                    {product.minOrder}
                  </span>
                </div>
                <div>
                  Max order:{' '}
                  <span className="font-mono tabular-nums">
                    {product.maxOrder}
                  </span>
                </div>
                {product.accentColor && (
                  <div className="flex items-center gap-2">
                    <span>Accent:</span>
                    <span
                      className="h-4 w-4 rounded-sm border"
                      style={{ borderColor: product.accentColor }}
                      aria-label={`Accent ${product.accentColor}`}
                    />
                    <span className="text-xs text-neutral-500">
                      {product.accentColor}
                    </span>
                  </div>
                )}
                {product.seasonStartWeek && product.seasonEndWeek && (
                  <div>
                    Season: Week {product.seasonStartWeek} -{' '}
                    {product.seasonEndWeek}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
