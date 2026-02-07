import Link from 'next/link'
import { notFound } from 'next/navigation'
import { adminProducts } from '@/lib/admin-mock-data'
import { formatCurrency } from '@/lib/admin-utils'

interface ProductDetailPageProps {
  params: { productId: string }
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = adminProducts.find((item) => item.id === params.productId)

  if (!product) {
    notFound()
  }

  const characteristics = {
    temperament: 'Calm',
    egg_color: 'Dark',
    egg_size: 'Large',
    notes: 'Draft data for admin review.',
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Product
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          {product.name}
        </h1>
        <div className="mt-2">
          <Link
            href="/admin/products"
            className="rounded-sm px-1 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 focus-ring"
          >
            Back to products
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Core details
          </div>
          <div className="mt-3 grid gap-4 text-sm text-neutral-700 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Name
              </div>
              <input className="input mt-2" value={product.name} readOnly />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Type
              </div>
              <input
                className="input mt-2"
                value={product.productType === 'eggs' ? 'Eggs' : 'Pig box'}
                readOnly
              />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Price
              </div>
              <input
                className="input mt-2"
                value={`${formatCurrency(product.pricePerUnit)} ${product.unitLabel}`}
                readOnly
              />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Order range
              </div>
              <input
                className="input mt-2"
                value={`${product.minOrder} - ${product.maxOrder}`}
                readOnly
              />
            </div>
          </div>
        </section>

        {product.productType === 'eggs' ? (
          <section className="rounded-sm border border-neutral-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Egg configuration
            </div>
            <div className="mt-3 grid gap-4 text-sm text-neutral-700 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Accent color
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded-sm border"
                    style={{ borderColor: product.accentColor }}
                  />
                  <span className="text-xs text-neutral-500">
                    {product.accentColor}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Seasonal weeks
                </div>
                <input
                  className="input mt-2"
                  value={`Week ${product.seasonStartWeek} - ${product.seasonEndWeek}`}
                  readOnly
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Characteristics
              </div>
              <textarea
                className="input mt-2 font-mono text-xs"
                rows={6}
                value={JSON.stringify(characteristics, null, 2)}
                readOnly
              />
            </div>

            <div className="mt-4 grid gap-4 text-sm text-neutral-700 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Incubation
                </div>
                <input className="input mt-2" value="21 days" readOnly />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Temperature
                </div>
                <input className="input mt-2" value="37.5 C" readOnly />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Humidity
                </div>
                <input className="input mt-2" value="45% to 55%" readOnly />
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-sm border border-neutral-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Pig box configuration
            </div>
            <div className="mt-3 grid gap-4 text-sm text-neutral-700 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Slaughter weeks
                </div>
                <input
                  className="input mt-2"
                  value={`Week ${product.seasonStartWeek} - ${product.seasonEndWeek}`}
                  readOnly
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Estimated carcass weight
                </div>
                <input className="input mt-2" value="110 - 130 kg" readOnly />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Deposit rule
                </div>
                <input
                  className="input mt-2"
                  value="Deposit required before slaughter week"
                  readOnly
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Pricing tier
                </div>
                <input className="input mt-2" value="Standard box" readOnly />
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Box contents
                </div>
                <textarea
                  className="input mt-2"
                  rows={4}
                  value="Trim, ribs, shoulder, ground. Frozen unless noted."
                  readOnly
                />
              </div>
            </div>
          </section>
        )}

        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Change policy
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            Changes here do not affect existing orders.
          </p>
        </section>
      </div>
    </div>
  )
}
