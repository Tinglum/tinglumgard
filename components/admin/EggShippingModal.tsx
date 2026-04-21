'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  Copy,
  Egg,
  Gift,
  Loader2,
  MapPin,
  Package,
  Phone,
  Send,
  Star,
  User,
  Mail,
  X,
} from 'lucide-react'

const WISHLIST_DISCOUNT = 0.30

interface ShippingOrder {
  id: string
  order_number: string
  status: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  shipping_name: string | null
  shipping_email: string | null
  shipping_phone: string | null
  shipping_address: string | null
  shipping_postal_code: string | null
  shipping_city: string | null
  shipping_country: string | null
  quantity: number
  price_per_egg: number
  subtotal: number
  delivery_fee: number
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  delivery_method: string
  year: number
  week_number: number
  delivery_monday: string
  tracking_number: string | null
  notes: string | null
  admin_notes: string | null
  egg_breeds?: { id: string; name: string } | null
  egg_order_additions?: Array<{
    id: string
    quantity: number
    price_per_egg: number
    subtotal: number
    egg_breeds?: { id: string; name: string } | null
  }>
}

interface WishlistItem {
  id: string
  breed_id: string
  qty_requested: number
  qty_allocated: number
  qty_remaining: number
  egg_breeds?: { name: string; price_per_egg?: number } | null
}

interface WishlistRequest {
  id: string
  status: string
  year: number
  week_number: number
  delivery_monday: string | null
  notes: string | null
  egg_wishlist_items?: WishlistItem[]
}

interface ShippingMeta {
  totalEggs: number
  estimatedWeightGrams: number
}

interface FulfillmentAvailabilityEntry {
  remaining: number
  source: 'actual_collected' | 'inventory_fallback'
  actualCollected: number | null
  eggsAllocated: number
  collectionDaysRecorded: number
}

interface EggShippingModalProps {
  orderId: string | null
  open: boolean
  onClose: () => void
  lang: string
}

interface FulfillItem {
  wishlistItemId: string
  breedId: string
  breedName: string
  qtyMax: number
  qty: number
  pricePerEggOre: number
}

export function EggShippingModal({ orderId, open, onClose, lang }: EggShippingModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<ShippingOrder | null>(null)
  const [wishlist, setWishlist] = useState<WishlistRequest[]>([])
  const [meta, setMeta] = useState<ShippingMeta | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [fulfillmentAvailability, setFulfillmentAvailability] = useState<Record<string, FulfillmentAvailabilityEntry>>({})

  const [fulfillMode, setFulfillMode] = useState(false)
  const [fulfillItems, setFulfillItems] = useState<FulfillItem[]>([])
  const [fulfillSubmitting, setFulfillSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/eggs/orders/${orderId}/shipping`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setOrder(data.order)
      setWishlist(data.wishlistRequests || [])
      setFulfillmentAvailability(data.fulfillmentAvailability || {})
      setMeta(data.shippingMeta)
      setTrackingNumber(data.order.tracking_number || '')
    } catch {
      toast({
        title: lang === 'no' ? 'Feil' : 'Error',
        description: lang === 'no' ? 'Kunne ikke laste ordredata' : 'Failed to load order data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [orderId, lang, toast])

  useEffect(() => {
    if (open && orderId) {
      fetchData()
    } else {
      setOrder(null)
      setWishlist([])
      setFulfillmentAvailability({})
      setMeta(null)
      setTrackingNumber('')
      setFulfillMode(false)
      setFulfillItems([])
    }
  }, [open, orderId, fetchData])

  async function handleMarkShipped() {
    if (!order || !trackingNumber.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/eggs/orders/${order.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_shipped',
          data: { trackingNumber: trackingNumber.trim() },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      toast({
        title: lang === 'no' ? 'Sendt!' : 'Shipped!',
        description: lang === 'no'
          ? `${order.order_number} markert som sendt`
          : `${order.order_number} marked as shipped`,
      })
      onClose()
    } catch (e: any) {
      toast({
        title: lang === 'no' ? 'Feil' : 'Error',
        description: e.message || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({
      title: lang === 'no' ? 'Kopiert' : 'Copied',
      description: text,
    })
  }

  function enterFulfillMode() {
    const items: FulfillItem[] = []
    const remainingByBreed = new Map<string, number>(
      Object.entries(fulfillmentAvailability).map(([breedId, entry]) => [
        breedId,
        Math.max(0, Number(entry?.remaining || 0)),
      ])
    )

    for (const req of wishlist) {
      for (const item of req.egg_wishlist_items || []) {
        if (item.qty_remaining > 0) {
          const breedRemaining = remainingByBreed.has(item.breed_id)
            ? remainingByBreed.get(item.breed_id) || 0
            : item.qty_remaining
          const qtyMax = Math.min(item.qty_remaining, breedRemaining)
          if (qtyMax <= 0) {
            continue
          }

          items.push({
            wishlistItemId: item.id,
            breedId: item.breed_id,
            breedName: item.egg_breeds?.name || 'Ukjent rase',
            qtyMax,
            qty: qtyMax,
            pricePerEggOre: item.egg_breeds?.price_per_egg || 0,
          })

          if (remainingByBreed.has(item.breed_id)) {
            remainingByBreed.set(item.breed_id, Math.max(0, breedRemaining - qtyMax))
          }
        }
      }
    }
    setFulfillItems(items)
    setFulfillMode(true)
  }

  function updateFulfillQty(wishlistItemId: string, qty: number) {
    setFulfillItems((prev) =>
      prev.map((item) =>
        item.wishlistItemId === wishlistItemId
          ? { ...item, qty: Math.min(item.qtyMax, Math.max(0, Math.round(qty))) }
          : item
      )
    )
  }

  const totalFulfillOre = fulfillItems
    .filter((item) => item.qty > 0)
    .reduce((sum, item) => {
      const discountedPrice = Math.round(item.pricePerEggOre * (1 - WISHLIST_DISCOUNT))
      return sum + item.qty * discountedPrice
    }, 0)

  async function handleFulfillWishlist() {
    if (!order) return
    const activeItems = fulfillItems.filter((item) => item.qty > 0)
    if (activeItems.length === 0) return

    setFulfillSubmitting(true)
    try {
      const res = await fetch(`/api/admin/eggs/orders/${order.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fulfill_wishlist',
          data: {
            items: activeItems.map((item) => ({
              wishlistItemId: item.wishlistItemId,
              breedId: item.breedId,
              qty: item.qty,
            })),
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      const totalNok = Math.round(totalFulfillOre / 100)
      toast({
        title: lang === 'no' ? 'Betalingslink sendt!' : 'Payment link sent!',
        description: lang === 'no'
          ? `${order.customer_email} har fått e-post med betalingslink — kr ${totalNok}`
          : `Payment link sent to ${order.customer_email} — kr ${totalNok}`,
      })
      setFulfillMode(false)
      await fetchData()
    } catch (e: any) {
      toast({
        title: lang === 'no' ? 'Feil' : 'Error',
        description: e.message || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setFulfillSubmitting(false)
    }
  }

  const shippingName = order?.shipping_name || order?.customer_name || ''
  const shippingPhone = order?.shipping_phone || order?.customer_phone || ''
  const shippingEmail = order?.shipping_email || order?.customer_email || ''
  const shippingAddress = order?.shipping_address || ''
  const shippingPostalCode = order?.shipping_postal_code || ''
  const shippingCity = order?.shipping_city || ''

  const fullAddress = [shippingAddress, `${shippingPostalCode} ${shippingCity}`.trim()]
    .filter(Boolean)
    .join(', ')

  const isAlreadyShipped = order?.status === 'shipped' || order?.status === 'delivered'

  const eggLines: Array<{ breed: string; quantity: number; pricePerEgg: number }> = []
  if (order) {
    eggLines.push({
      breed: order.egg_breeds?.name || 'Ukjent rase',
      quantity: order.quantity,
      pricePerEgg: order.price_per_egg,
    })
    for (const addition of order.egg_order_additions || []) {
      eggLines.push({
        breed: addition.egg_breeds?.name || 'Ukjent rase',
        quantity: addition.quantity,
        pricePerEgg: addition.price_per_egg,
      })
    }
  }

  const fulfillableItems = wishlist.flatMap((req) =>
    (req.egg_wishlist_items || []).filter((item) => {
      if (item.qty_remaining <= 0) return false
      const available = fulfillmentAvailability[item.breed_id]?.remaining
      return available === undefined ? true : available > 0
    })
  )
  const hasFulfillable = fulfillableItems.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-medium">
            <Package className="w-5 h-5" />
            {lang === 'no' ? 'Klargjør sending' : 'Prepare Shipment'}
            {order && (
              <span className="text-sm font-normal text-neutral-500 ml-1">
                {order.order_number}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : !order ? (
          <p className="text-sm text-neutral-500 py-8 text-center">
            {lang === 'no' ? 'Ordre ikke funnet' : 'Order not found'}
          </p>
        ) : (
          <div className="space-y-5">
            {/* Status badge */}
            {isAlreadyShipped && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <CheckCircle2 className="w-4 h-4" />
                {lang === 'no' ? 'Allerede sendt' : 'Already shipped'}
                {order.tracking_number && (
                  <span className="font-mono text-xs ml-auto">{order.tracking_number}</span>
                )}
              </div>
            )}

            {/* Egg contents */}
            <section>
              <h3 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1.5">
                <Egg className="w-4 h-4" />
                {lang === 'no' ? 'Innhold' : 'Contents'}
              </h3>
              <div className="bg-neutral-50 rounded-lg p-3 space-y-1.5">
                {eggLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-900">{line.breed}</span>
                    <span className="text-neutral-600 tabular-nums">
                      {line.quantity} {lang === 'no' ? 'egg' : 'eggs'}
                    </span>
                  </div>
                ))}
                <div className="border-t border-neutral-200 pt-1.5 mt-1.5 flex items-center justify-between text-sm font-medium">
                  <span>{lang === 'no' ? 'Totalt' : 'Total'}</span>
                  <span className="tabular-nums">
                    {meta?.totalEggs} {lang === 'no' ? 'egg' : 'eggs'}
                    <span className="text-neutral-400 font-normal ml-2">
                      ~{meta ? Math.round(meta.estimatedWeightGrams / 10) * 10 : 0}g
                    </span>
                  </span>
                </div>
              </div>
            </section>

            {/* Wishlist items */}
            {wishlist.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  {lang === 'no' ? 'Ønskeliste' : 'Wishlist'}
                </h3>

                {!fulfillMode ? (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      {wishlist.map((req) => (
                        <div key={req.id}>
                          <p className="text-xs text-amber-700 mb-1">
                            {lang === 'no' ? 'Uke' : 'Week'} {req.week_number}/{req.year} — {req.status}
                          </p>
                          {(req.egg_wishlist_items || []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-neutral-900">{item.egg_breeds?.name || 'Ukjent'}</span>
                              <span className="text-neutral-600 tabular-nums">
                                {item.qty_allocated}/{item.qty_requested}
                                {item.qty_remaining > 0 && (
                                  <span className="text-amber-600 ml-1">
                                    ({item.qty_remaining} {lang === 'no' ? 'gjenstår' : 'remaining'})
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                          {req.notes && (
                            <p className="text-xs text-amber-600 mt-1 italic">{req.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {hasFulfillable && !isAlreadyShipped && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enterFulfillMode}
                        className="w-full mt-2 border-amber-300 text-amber-800 hover:bg-amber-50 hover:border-amber-400"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        {lang === 'no'
                          ? `Tildel ønskelistegg — 30% rabatt`
                          : `Fulfill wishlist eggs — 30% off`}
                      </Button>
                    )}
                  </>
                ) : (
                  /* Fulfillment panel */
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                        <Gift className="w-4 h-4" />
                        {lang === 'no' ? 'Tildel ekstra egg — 30% rabatt' : 'Fulfill extra eggs — 30% off'}
                      </p>
                      <button
                        onClick={() => setFulfillMode(false)}
                        className="text-amber-600 hover:text-amber-900 p-0.5 rounded"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-amber-700 leading-relaxed">
                      {lang === 'no'
                        ? 'Velg antall per rase. Kunden mottar e-post med Vipps-betalingslink.'
                        : 'Choose qty per breed. Customer receives email with Vipps payment link.'}
                    </p>

                    <div className="space-y-3">
                      {fulfillItems.map((item) => {
                        const discountedOre = Math.round(item.pricePerEggOre * (1 - WISHLIST_DISCOUNT))
                        const subtotalOre = item.qty * discountedOre
                        return (
                          <div key={item.wishlistItemId} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-neutral-900">
                                {item.breedName}
                              </span>
                              <div className="flex items-center gap-2 text-xs">
                                {item.pricePerEggOre > 0 && (
                                  <span className="text-neutral-400 line-through">
                                    kr {Math.round(item.pricePerEggOre / 100)}/egg
                                  </span>
                                )}
                                {discountedOre > 0 && (
                                  <span className="text-green-700 font-semibold">
                                    kr {Math.round(discountedOre / 100)}/egg
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min={0}
                                max={item.qtyMax}
                                value={item.qty}
                                onChange={(e) =>
                                  updateFulfillQty(item.wishlistItemId, Number(e.target.value))
                                }
                                className="w-20 text-sm border border-amber-200 rounded-md px-2 py-1.5 bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                              <span className="text-xs text-amber-700">
                                {lang === 'no' ? `maks ${item.qtyMax}` : `max ${item.qtyMax}`}
                              </span>
                              {subtotalOre > 0 && (
                                <span className="ml-auto text-sm font-semibold text-neutral-800">
                                  kr {Math.round(subtotalOre / 100)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="border-t border-amber-200 pt-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">
                        {lang === 'no' ? 'Totalt å betale' : 'Total to pay'}
                      </span>
                      <span className="text-base font-bold text-neutral-900">
                        kr {Math.round(totalFulfillOre / 100)}
                      </span>
                    </div>

                    <Button
                      onClick={handleFulfillWishlist}
                      disabled={fulfillSubmitting || totalFulfillOre <= 0}
                      size="sm"
                      className="w-full bg-amber-700 hover:bg-amber-800 text-white"
                    >
                      {fulfillSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {lang === 'no' ? 'Send betalingslink til kunde' : 'Send payment link to customer'}
                    </Button>

                    <p className="text-xs text-amber-700 text-center">
                      {lang === 'no'
                        ? `Kunden får e-post med Vipps-link til kr ${Math.round(totalFulfillOre / 100)}`
                        : `Customer gets email with Vipps link for kr ${Math.round(totalFulfillOre / 100)}`}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Shipping address */}
            <section>
              <h3 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {lang === 'no' ? 'Leveringsadresse' : 'Shipping Address'}
              </h3>
              <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                <CopyRow icon={<User className="w-3.5 h-3.5" />} label={shippingName} onCopy={() => copyToClipboard(shippingName)} />
                {shippingAddress && (
                  <CopyRow icon={<MapPin className="w-3.5 h-3.5" />} label={fullAddress} onCopy={() => copyToClipboard(fullAddress)} />
                )}
                {shippingPhone && (
                  <CopyRow icon={<Phone className="w-3.5 h-3.5" />} label={shippingPhone} onCopy={() => copyToClipboard(shippingPhone)} />
                )}
                {shippingEmail && (
                  <CopyRow icon={<Mail className="w-3.5 h-3.5" />} label={shippingEmail} onCopy={() => copyToClipboard(shippingEmail)} />
                )}
                {!shippingAddress && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    ⚠ {lang === 'no' ? 'Adresse mangler!' : 'Address missing!'}
                  </p>
                )}
              </div>
            </section>

            {/* Order notes */}
            {order.notes && (
              <section>
                <h3 className="text-xs font-medium text-neutral-500 mb-1">
                  {lang === 'no' ? 'Kundens merknad' : 'Customer note'}
                </h3>
                <p className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3">{order.notes}</p>
              </section>
            )}

            {/* Tracking number + Ship button */}
            {!isAlreadyShipped && (
              <section className="border-t border-neutral-200 pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700 block mb-1.5">
                    {lang === 'no'
                      ? 'Sporingsnummer — varenummer, sending​snummer eller Posten-lenke'
                      : 'Tracking — item number, consignment number or Posten URL'}
                  </label>
                  <Input
                    placeholder="370722152417281240 / sporing.posten.no/sporing/..."
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleMarkShipped}
                  disabled={!trackingNumber.trim() || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {lang === 'no' ? 'Marker som sendt' : 'Mark as shipped'}
                </Button>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CopyRow({ icon, label, onCopy }: { icon: React.ReactNode; label: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-neutral-400">{icon}</span>
      <span className="text-sm text-neutral-900 flex-1">{label}</span>
      <button
        onClick={onCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-200"
        title="Copy"
      >
        <Copy className="w-3.5 h-3.5 text-neutral-400" />
      </button>
    </div>
  )
}
