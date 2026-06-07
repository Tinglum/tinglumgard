'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
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
  AlertTriangle,
  ChevronDown,
  ChevronRight,
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
  inventory_id?: string | null
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
  price_adjustment_ore?: number | null
  egg_breeds?: { id: string; name: string } | null
  egg_payments?: Array<{
    payment_type?: string | null
    status?: string | null
    amount_nok?: number | null
  }> | null
  egg_order_additions?: Array<{
    id: string
    inventory_id?: string | null
    quantity: number
    price_per_egg: number
    subtotal: number
    egg_breeds?: { id: string; name: string } | null
    egg_inventory?: { egg_breeds?: { id?: string | null; name?: string | null } | null } | null
  }>
  weekly_inventory_rows?: EggAdjustInventoryRow[]
  prev_weekly_inventory_rows?: EggAdjustInventoryRow[]
  adjustment_availability?: Record<string, EggAdjustAvailabilityEntry>
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

type EggAdjustState = {
  quantity: number
}

type EggAdjustAvailabilityEntry = {
  inventoryId: string
  breedId: string
  breedName: string
  remaining: number
  source: 'actual_collected' | 'inventory_fallback' | 'manual_override'
  actualCollected: number | null
  eggsAvailable: number
  eggsAllocated: number
  inventoryRemaining: number
  collectionDaysRecorded: number
  manualOverride: boolean
  weekLabel?: 'current' | 'previous'
}

type EggAdjustInventoryRow = {
  id: string
  breed_id: string
  eggs_available?: number | null
  eggs_allocated?: number | null
  manual_override?: boolean | null
  status?: string | null
  egg_breeds?:
    | { id?: string | null; name?: string | null; price_per_egg?: number | null }
    | Array<{ id?: string | null; name?: string | null; price_per_egg?: number | null }>
    | null
}

type EggOrderLine = {
  key: string
  quantity: number
  breedName: string
  kind: 'base' | 'addition'
}

type EggOrderBreakdown = {
  lines: EggOrderLine[]
  groupedLines: Array<{ key: string; breedName: string; quantity: number }>
  baseQuantity: number
  additionsQuantity: number
  totalQuantity: number
}

type TaggedInventoryRow = EggAdjustInventoryRow & { weekLabel?: 'current' | 'previous' }

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

function relationName(relation: any): string {
  if (Array.isArray(relation)) {
    return String(relation[0]?.name || '').trim()
  }
  return String(relation?.name || '').trim()
}

function getEggOrderLines(order: ShippingOrder | null): EggOrderLine[] {
  if (!order) return []
  const lines: EggOrderLine[] = []
  const baseBreedName = relationName(order.egg_breeds) || 'Rugeegg'

  if (Number(order.quantity || 0) > 0) {
    lines.push({
      key: `base:${baseBreedName}`,
      quantity: Number(order.quantity || 0),
      breedName: baseBreedName,
      kind: 'base',
    })
  }

  for (const addition of order.egg_order_additions || []) {
    const breedName =
      relationName(addition?.egg_breeds) ||
      relationName(addition?.egg_inventory?.egg_breeds) ||
      'Tillegg'
    lines.push({
      key: String(addition?.id || `${breedName}:${addition?.quantity || 0}`),
      quantity: Number(addition?.quantity || 0),
      breedName,
      kind: 'addition',
    })
  }

  return lines
}

function getEggOrderBreakdown(order: ShippingOrder | null): EggOrderBreakdown {
  const lines = getEggOrderLines(order)
  const grouped = new Map<string, { key: string; breedName: string; quantity: number }>()
  let baseQuantity = 0
  let additionsQuantity = 0

  for (const line of lines) {
    if (line.kind === 'base') baseQuantity += line.quantity
    else additionsQuantity += line.quantity

    const existing = grouped.get(line.breedName)
    if (existing) existing.quantity += line.quantity
    else grouped.set(line.breedName, { key: line.breedName, breedName: line.breedName, quantity: line.quantity })
  }

  return {
    lines,
    groupedLines: Array.from(grouped.values()),
    baseQuantity,
    additionsQuantity,
    totalQuantity: baseQuantity + additionsQuantity,
  }
}

function getEggCurrentQuantitiesByInventory(order: ShippingOrder | null): Map<string, number> {
  const quantities = new Map<string, number>()
  const baseInventoryId = String(order?.inventory_id || '').trim()
  const baseQuantity = Math.max(0, Number(order?.quantity || 0))

  if (baseInventoryId && baseQuantity > 0) {
    quantities.set(baseInventoryId, baseQuantity)
  }

  for (const addition of order?.egg_order_additions || []) {
    const inventoryId = String(addition?.inventory_id || '').trim()
    const quantity = Math.max(0, Number(addition?.quantity || 0))
    if (!inventoryId || quantity <= 0) continue
    quantities.set(inventoryId, (quantities.get(inventoryId) || 0) + quantity)
  }

  return quantities
}

function getEggAdjustInventoryRows(order: ShippingOrder | null): TaggedInventoryRow[] {
  const current: TaggedInventoryRow[] = Array.isArray(order?.weekly_inventory_rows)
    ? order!.weekly_inventory_rows!.map((row: any) => ({ ...row, weekLabel: 'current' as const }))
    : []
  const previous: TaggedInventoryRow[] = Array.isArray(order?.prev_weekly_inventory_rows)
    ? order!.prev_weekly_inventory_rows!.map((row: any) => ({ ...row, weekLabel: 'previous' as const }))
    : []
  return [...current, ...previous]
}

function getEggAdjustAvailability(order: ShippingOrder | null): Record<string, EggAdjustAvailabilityEntry> {
  return order?.adjustment_availability || {}
}

function buildEggAdjustInitialState(order: ShippingOrder | null): Record<string, EggAdjustState> {
  const quantitiesByInventory = getEggCurrentQuantitiesByInventory(order)
  const nextState: Record<string, EggAdjustState> = {}

  for (const inventoryRow of getEggAdjustInventoryRows(order)) {
    const inventoryId = String(inventoryRow?.id || '').trim()
    if (!inventoryId) continue
    nextState[inventoryId] = {
      quantity: quantitiesByInventory.get(inventoryId) || 0,
    }
  }

  return nextState
}

function EggOrderSummaryBlock({
  breakdown,
  lang,
  showAdjustmentHint = false,
}: {
  breakdown: EggOrderBreakdown
  lang: string
  showAdjustmentHint?: boolean
}) {
  const no = lang === 'no'

  return (
    <div className="w-full space-y-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Totalt' : 'Total'}</p>
          <p className="mt-1 font-semibold text-neutral-900">{breakdown.totalQuantity} {no ? 'egg' : 'eggs'}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Grunnbestilling' : 'Base order'}</p>
          <p className="mt-1 font-semibold text-neutral-900">{breakdown.baseQuantity} {no ? 'egg' : 'eggs'}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Ekstra egg' : 'Extra eggs'}</p>
          <p className="mt-1 font-semibold text-neutral-900">{breakdown.additionsQuantity} {no ? 'egg' : 'eggs'}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          <span>{no ? 'Rase' : 'Breed'}</span>
          <span className="text-right">{no ? 'Antall' : 'Qty'}</span>
        </div>
        {breakdown.groupedLines.map((line, index) => (
          <div key={line.key} className={`grid grid-cols-[minmax(0,1fr)_90px] gap-3 px-3 py-2 text-sm ${index > 0 ? 'border-t border-neutral-100' : ''}`}>
            <span className="truncate text-neutral-700">{line.breedName}</span>
            <span className="text-right font-medium text-neutral-900">{line.quantity}</span>
          </div>
        ))}
      </div>

      {showAdjustmentHint ? (
        <p className="text-xs text-neutral-500">
          {no
            ? 'Juster én rase per rad under. Lageret oppdateres når du lagrer.'
            : 'Adjust one breed per row below. Inventory updates when you save.'}
        </p>
      ) : null}
    </div>
  )
}

function SectionToggle({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors">
        <span className="text-sm font-medium text-neutral-800">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />}
      </button>
      {open ? <div className="border-t border-neutral-100 px-5 py-4">{children}</div> : null}
    </div>
  )
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
  const [sectionAdjust, setSectionAdjust] = useState(false)
  const [eggAdjustments, setEggAdjustments] = useState<Record<string, EggAdjustState>>({})
  const [eggPriceAdjNok, setEggPriceAdjNok] = useState('')
  const [eggSaving, setEggSaving] = useState(false)

  const [fulfillMode, setFulfillMode] = useState(false)
  const [fulfillItems, setFulfillItems] = useState<FulfillItem[]>([])
  const [fulfillSubmitting, setFulfillSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const [shippingRes, detailRes] = await Promise.all([
        fetch(`/api/admin/eggs/orders/${orderId}/shipping`),
        fetch(`/api/admin/eggs/orders/${orderId}`),
      ])
      if (!shippingRes.ok || !detailRes.ok) throw new Error('Failed to load')

      const shippingData = await shippingRes.json()
      const detailData = await detailRes.json()
      const mergedOrder: ShippingOrder = {
        ...(detailData || {}),
        ...(shippingData.order || {}),
        weekly_inventory_rows: detailData?.weekly_inventory_rows || [],
        prev_weekly_inventory_rows: detailData?.prev_weekly_inventory_rows || [],
        adjustment_availability: detailData?.adjustment_availability || {},
      }

      setOrder(mergedOrder)
      setWishlist(shippingData.wishlistRequests || [])
      setFulfillmentAvailability(shippingData.fulfillmentAvailability || {})
      setMeta(shippingData.shippingMeta)
      setTrackingNumber(shippingData.order.tracking_number || '')
      setEggAdjustments(buildEggAdjustInitialState(mergedOrder))
      const existingAdj = Number(mergedOrder?.price_adjustment_ore ?? 0)
      setEggPriceAdjNok(existingAdj !== 0 ? String(existingAdj / 100) : '')
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
      setSectionAdjust(false)
      setEggAdjustments({})
      setEggPriceAdjNok('')
      setFulfillMode(false)
      setFulfillItems([])
    }
  }, [open, orderId, fetchData])

  function updateEggLineQuantity(inventoryId: string, nextQuantity: number) {
    setEggAdjustments((prev) => ({
      ...prev,
      [inventoryId]: {
        quantity: Math.max(0, Math.round(nextQuantity)),
      },
    }))
  }

  async function submitEggAdjustments() {
    if (!order) return
    setEggSaving(true)
    try {
      const payloadLines = getEggAdjustInventoryRows(order).map((inventoryRow) => {
        const inventoryId = String(inventoryRow?.id || '').trim()
        const adjustment = eggAdjustments[inventoryId] || { quantity: 0 }
        return {
          inventoryId,
          quantity: Math.max(0, Math.round(Number(adjustment.quantity || 0))),
        }
      })

      if (!payloadLines.some((line) => line.quantity > 0)) {
        throw new Error(lang === 'no' ? 'Bestillingen må ha minst én eggrase med antall over 0' : 'Order must have at least one egg breed with quantity above 0')
      }

      const rawAdj = eggPriceAdjNok.trim()
      const priceAdjustmentOre = rawAdj === '' ? 0 : Math.round(parseFloat(rawAdj) * 100)

      const res = await fetch(`/api/admin/eggs/orders/${order.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_order_lines',
          data: {
            lines: payloadLines,
            priceAdjustmentOre,
          },
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || (lang === 'no' ? 'Feil ved oppdatering' : 'Update failed'))

      toast({
        title: lang === 'no' ? 'Oppdatert' : 'Updated',
        description: lang === 'no' ? 'Egglinjene og lagerreservasjonen er oppdatert.' : 'Egg lines and inventory were updated.',
      })
      await fetchData()
    } catch (e: any) {
      toast({
        title: lang === 'no' ? 'Feil' : 'Error',
        description: e.message || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setEggSaving(false)
    }
  }

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
      <DialogContent className="mx-4 sm:mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

            <SectionToggle
              title={lang === 'no' ? 'Juster bestilling' : 'Adjust order details'}
              open={sectionAdjust}
              onToggle={() => setSectionAdjust((value) => !value)}
            >
              <ShippingEggAdjustPanel
                order={order}
                lang={lang}
                adjustments={eggAdjustments}
                onQuantityChange={updateEggLineQuantity}
                priceAdjustmentNok={eggPriceAdjNok}
                onPriceAdjustmentChange={setEggPriceAdjNok}
                onSave={submitEggAdjustments}
                saving={eggSaving}
              />
            </SectionToggle>

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

function ShippingEggAdjustPanel({
  order,
  lang,
  adjustments,
  onQuantityChange,
  priceAdjustmentNok,
  onPriceAdjustmentChange,
  onSave,
  saving,
}: {
  order: ShippingOrder
  lang: string
  adjustments: Record<string, EggAdjustState>
  onQuantityChange: (inventoryId: string, nextQuantity: number) => void
  priceAdjustmentNok: string
  onPriceAdjustmentChange: (value: string) => void
  onSave: () => void
  saving: boolean
}) {
  const no = lang === 'no'
  const breakdown = getEggOrderBreakdown(order)
  const currentQuantities = getEggCurrentQuantitiesByInventory(order)
  const initialState = buildEggAdjustInitialState(order)
  const availability = getEggAdjustAvailability(order)
  const allInventoryRows = getEggAdjustInventoryRows(order)

  const rowData = allInventoryRows.map((inventoryRow) => {
    const inventoryId = String(inventoryRow?.id || '').trim()
    const breedName = relationName(inventoryRow?.egg_breeds) || 'Rugeegg'
    const weekLabel = inventoryRow.weekLabel
    const currentQuantity = currentQuantities.get(inventoryId) || 0
    const state = adjustments[inventoryId] || initialState[inventoryId] || { quantity: currentQuantity }
    const requestedQuantity = Math.max(0, Math.round(Number(state.quantity || 0)))
    const availabilityEntry = availability[inventoryId]
    const systemFreeNow = Math.max(
      0,
      Number(availabilityEntry?.remaining ?? (Number(inventoryRow?.eggs_available || 0) - Number(inventoryRow?.eggs_allocated || 0)))
    )
    const actualCollected = availabilityEntry?.actualCollected ?? null
    const maxQuantity = actualCollected !== null ? actualCollected : currentQuantity + systemFreeNow
    const hasError = requestedQuantity > maxQuantity
    const eggsAllocated = Number(availabilityEntry?.eggsAllocated ?? inventoryRow?.eggs_allocated ?? 0)
    const allocatedToOthers = Math.max(0, eggsAllocated - currentQuantity)
    const inventoryRemaining = availabilityEntry?.inventoryRemaining ?? null

    return {
      inventoryId,
      breedName,
      weekLabel,
      currentQuantity,
      requestedQuantity,
      maxQuantity,
      systemFreeNow,
      actualCollected,
      hasError,
      allocatedToOthers,
      inventoryRemaining,
    }
  })

  const nextTotalEggs = rowData.reduce((sum, row) => sum + row.requestedQuantity, 0)
  const totalDelta = nextTotalEggs - breakdown.totalQuantity
  const invalidRows = rowData.filter((row) => row.hasError)
  const hasQtyChanges = rowData.some(
    (row) => row.requestedQuantity !== Math.max(0, Number(initialState[row.inventoryId]?.quantity ?? row.currentQuantity))
  )
  const initialPriceAdjNok =
    Number(order?.price_adjustment_ore ?? 0) !== 0 ? String((order?.price_adjustment_ore || 0) / 100) : ''
  const priceAdjRaw = priceAdjustmentNok.trim()
  const priceAdjParsed = priceAdjRaw === '' ? 0 : parseFloat(priceAdjRaw)
  const priceAdjValid = priceAdjRaw === '' || (!Number.isNaN(priceAdjParsed) && Number.isFinite(priceAdjParsed))
  const hasPriceAdjChange = priceAdjustmentNok !== initialPriceAdjNok
  const hasChanges = hasQtyChanges || hasPriceAdjChange

  const breedGroupMap = new Map<string, typeof rowData>()
  for (const row of rowData) {
    const group = breedGroupMap.get(row.breedName) || []
    group.push(row)
    breedGroupMap.set(row.breedName, group)
  }
  const breedGroups = Array.from(breedGroupMap.entries()).map(([breedName, rows]) => ({
    breedName,
    rows: [...rows].sort((a, b) => {
      if (a.weekLabel === 'current' && b.weekLabel === 'previous') return -1
      if (a.weekLabel === 'previous' && b.weekLabel === 'current') return 1
      return 0
    }),
  }))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <EggOrderSummaryBlock breakdown={breakdown} lang={lang} showAdjustmentHint />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-sm font-medium text-neutral-900">
            {no ? 'Juster bestilling per rase' : 'Adjust order by breed'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {no
              ? 'Her kan du bruke egg fra denne uken og forrige uke når du justerer utsendingen.'
              : 'You can use eggs from this week and last week when adjusting the shipment.'}
          </p>
        </div>

        {breedGroups.length === 0 ? (
          <div className="px-4 py-6 text-sm text-neutral-500">
            {no ? 'Ingen lagerlinjer funnet.' : 'No inventory rows found.'}
          </div>
        ) : null}

        <div className="divide-y divide-neutral-200">
          {breedGroups.map(({ breedName, rows }) => (
            <div key={breedName} className="space-y-2 px-4 py-4">
              <p className="text-sm font-medium text-neutral-900">{breedName}</p>
              <div className="space-y-2">
                {rows.map((row) => {
                  const weekText = row.weekLabel === 'previous'
                    ? (no ? 'Forrige uke' : 'Previous week')
                    : (no ? 'Denne uken' : 'This week')

                  return (
                    <div key={row.inventoryId} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.weekLabel === 'previous'
                              ? 'border border-amber-200 bg-amber-100 text-amber-800'
                              : 'border border-blue-200 bg-blue-100 text-blue-800'
                          }`}>
                            {weekText}
                          </span>
                          {row.currentQuantity > 0 ? (
                            <span className="text-xs text-neutral-500">
                              {no ? 'I ordre' : 'In order'}: {row.currentQuantity}
                            </span>
                          ) : null}
                        </div>

                        {row.actualCollected !== null ? (
                          <p className="text-xs text-neutral-500">
                            {no ? 'Samlet' : 'Collected'}: {row.actualCollected} · {no ? 'maks' : 'max'} {row.maxQuantity}
                            {row.weekLabel === 'previous' && row.inventoryRemaining !== null ? (
                              <> · <span className={row.inventoryRemaining <= 0 ? 'font-medium text-red-500' : ''}>
                                {no ? 'Gjenværende' : 'Remaining'}: {row.inventoryRemaining}
                              </span></>
                            ) : null}
                            {row.weekLabel === 'current' && row.allocatedToOthers > 0 ? (
                              <> · <span className="font-medium text-amber-600">
                                {no ? `Andre ordre: ${row.allocatedToOthers}` : `Other orders: ${row.allocatedToOthers}`}
                              </span></>
                            ) : null}
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-500">
                            {no ? 'Fri beholdning' : 'Free stock'}: {row.systemFreeNow}
                          </p>
                        )}

                        {row.hasError ? (
                          <p className="text-xs font-medium text-red-600">
                            {no ? `Maks ${row.maxQuantity} egg` : `Max ${row.maxQuantity} eggs`}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => onQuantityChange(row.inventoryId, row.requestedQuantity - 1)}
                          disabled={row.requestedQuantity <= 0}
                        >
                          -
                        </Button>
                        <div className={`w-10 text-center text-sm font-semibold ${
                          row.hasError
                            ? 'text-red-700'
                            : row.requestedQuantity > row.currentQuantity
                              ? 'text-green-700'
                              : row.requestedQuantity < row.currentQuantity
                                ? 'text-amber-700'
                                : 'text-neutral-900'
                        }`}>
                          {row.requestedQuantity}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => onQuantityChange(row.inventoryId, row.requestedQuantity + 1)}
                          disabled={row.requestedQuantity >= row.maxQuantity}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white px-4 py-4 space-y-2">
        <div>
          <p className="text-sm font-medium text-neutral-900">{no ? 'Prisregulering' : 'Price adjustment'}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {no
              ? 'Negativt beløp = rabatt, positivt = tillegg.'
              : 'Negative amount = discount, positive amount = surcharge.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 text-sm text-neutral-600">kr</span>
          <Input
            type="number"
            step="1"
            value={priceAdjustmentNok}
            onChange={(e) => onPriceAdjustmentChange(e.target.value)}
            placeholder="0"
            className="max-w-[140px]"
          />
          {priceAdjRaw !== '' && priceAdjValid && priceAdjParsed !== 0 ? (
            <span className={`text-xs font-medium ${priceAdjParsed < 0 ? 'text-green-700' : 'text-amber-700'}`}>
              {priceAdjParsed < 0
                ? (no ? `Rabatt ${Math.abs(priceAdjParsed)} kr` : `Discount ${Math.abs(priceAdjParsed)} kr`)
                : (no ? `Tillegg ${priceAdjParsed} kr` : `Surcharge ${priceAdjParsed} kr`)}
            </span>
          ) : null}
          {priceAdjRaw !== '' && !priceAdjValid ? (
            <span className="text-xs text-red-600">{no ? 'Ugyldig beløp' : 'Invalid amount'}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'I ordre nå' : 'In order now'}</p>
          <p className="mt-1 font-semibold text-neutral-900">{breakdown.totalQuantity} {no ? 'egg' : 'eggs'}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Etter lagring' : 'After save'}</p>
          <p className="mt-1 font-semibold text-neutral-900">{nextTotalEggs} {no ? 'egg' : 'eggs'}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Endring' : 'Change'}</p>
          <p className={`mt-1 font-semibold ${totalDelta === 0 ? 'text-neutral-900' : totalDelta > 0 ? 'text-green-700' : 'text-red-700'}`}>
            {totalDelta > 0 ? '+' : ''}{totalDelta} {no ? 'egg' : 'eggs'}
          </p>
        </div>
      </div>

      {invalidRows.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{no ? 'Noen rader overskrider tilgjengelig beholdning.' : 'Some rows exceed available inventory.'}</p>
            <p className="text-xs text-red-600">{no ? 'Reduser antallet til maks per rad.' : 'Reduce quantities to the per-row max.'}</p>
          </div>
        </div>
      ) : null}

      <Button onClick={onSave} disabled={saving || !hasChanges || invalidRows.length > 0 || !priceAdjValid}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {no ? 'Lagre bestilling og oppdater lager' : 'Save order and update inventory'}
      </Button>
    </div>
  )
}

function CopyRow({ icon, label, onCopy }: { icon: ReactNode; label: string; onCopy: () => void }) {
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
