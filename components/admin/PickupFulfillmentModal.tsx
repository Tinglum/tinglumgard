'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
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
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  CreditCard,
  Calendar,
  User,
  Package,
  PackageCheck,
} from 'lucide-react'

// ─── types ────────────────────────────────────────────────────────────────────

type OrderType = 'egg' | 'chicken' | 'pig'

interface PickupOrder {
  id: string
  order_number: string
  customer_name: string
  type: OrderType
  pickup_date?: string | null
  pickup_time?: string | null
  status?: string
  [key: string]: any
}

interface AdjustBirdLine {
  label: string
  subLabel: string
  currentHens: number
  currentRoosters: number
  hensDelta: number
  roostersDelta: number
  onHensDelta: (d: number) => void
  onRoostersDelta: (d: number) => void
  ageWeeks?: number | null
  breedSlug?: string | null
}

/** Cream Legbar is sexed from birth; all other breeds are sexed at 10 weeks */
function isBirdSexed(ageWeeks: number | null | undefined, breedSlug?: string | null): boolean {
  if (breedSlug === 'cream-legbar') return true
  return (ageWeeks ?? 0) >= 10
}

type EggPaymentLike = {
  payment_type?: string | null
  status?: string | null
  amount_nok?: number | null
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

type EggAdjustAvailabilitySource = 'actual_collected' | 'inventory_fallback' | 'manual_override'

type EggAdjustAvailabilityEntry = {
  inventoryId: string
  breedId: string
  breedName: string
  remaining: number
  source: EggAdjustAvailabilitySource
  actualCollected: number | null
  eggsAvailable: number
  eggsAllocated: number
  inventoryRemaining: number
  collectionDaysRecorded: number
  manualOverride: boolean
}

type EggAdjustInventoryRow = {
  id: string
  breed_id: string
  eggs_available?: number | null
  eggs_allocated?: number | null
  manual_override?: boolean | null
  status?: string | null
  egg_breeds?: { id?: string | null; name?: string | null; price_per_egg?: number | null } | Array<{ id?: string | null; name?: string | null; price_per_egg?: number | null }> | null
}

type EggAdjustState = {
  quantity: number
  overrideRemaining: string
}

type BirdAdjustmentState = {
  hensDelta: number
  roostersDelta: number
}

type BirdPoolReturnState = {
  poolHensReturn: number
  poolRoostersReturn: number
}

type ChickenHatchOverrideState = {
  hensFreeNow: string
  roostersFreeNow: string
}

type ChickenAdjustLineItem = {
  key: string
  kind: 'main' | 'addition'
  hatchId: string
  breedName: string
  breedSlug: string | null
  ageWeeks: number | null
  currentHens: number
  currentRoosters: number
  pricePerHen: number
  pricePerRooster: number
  systemFreeHens: number
  systemFreeRoosters: number
}

function relationName(relation: any): string {
  if (Array.isArray(relation)) {
    return String(relation[0]?.name || '').trim()
  }
  return String(relation?.name || '').trim()
}

function useIsNorwegian() {
  const { lang } = useLanguage()
  return lang === 'no'
}

function getEggOrderLines(order: any): EggOrderLine[] {
  const lines: EggOrderLine[] = []
  const baseBreedName = relationName(order?.egg_breeds) || 'Rugeegg'

  if (Number(order?.quantity || 0) > 0) {
    lines.push({
      key: `base:${baseBreedName}`,
      quantity: Number(order.quantity || 0),
      breedName: baseBreedName,
      kind: 'base',
    })
  }

  for (const addition of order?.egg_order_additions || []) {
    const breedName = relationName(addition?.egg_breeds) || relationName(addition?.egg_inventory?.egg_breeds) || 'Tillegg'
    lines.push({
      key: String(addition?.id || `${breedName}:${addition?.quantity || 0}`),
      quantity: Number(addition?.quantity || 0),
      breedName,
      kind: 'addition',
    })
  }

  return lines
}

function getEggOrderBreakdown(order: any): EggOrderBreakdown {
  const lines = getEggOrderLines(order)
  const grouped = new Map<string, { key: string; breedName: string; quantity: number }>()
  let baseQuantity = 0
  let additionsQuantity = 0

  for (const line of lines) {
    if (line.kind === 'base') {
      baseQuantity += line.quantity
    } else {
      additionsQuantity += line.quantity
    }

    const existing = grouped.get(line.breedName)
    if (existing) {
      existing.quantity += line.quantity
    } else {
      grouped.set(line.breedName, {
        key: line.breedName,
        breedName: line.breedName,
        quantity: line.quantity,
      })
    }
  }

  return {
    lines,
    groupedLines: Array.from(grouped.values()),
    baseQuantity,
    additionsQuantity,
    totalQuantity: baseQuantity + additionsQuantity,
  }
}

function getEggOrderAdditionsTotalOre(order: any): number {
  return (order?.egg_order_additions || []).reduce(
    (sum: number, addition: any) => sum + Number(addition?.subtotal || 0),
    0
  )
}

function getEggCurrentQuantitiesByInventory(order: any): Map<string, number> {
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

function getEggAdjustInventoryRows(order: any): EggAdjustInventoryRow[] {
  return Array.isArray(order?.weekly_inventory_rows) ? order.weekly_inventory_rows : []
}

function getEggAdjustAvailability(order: any): Record<string, EggAdjustAvailabilityEntry> {
  return order?.adjustment_availability || {}
}

function buildEggAdjustInitialState(order: any): Record<string, EggAdjustState> {
  const quantitiesByInventory = getEggCurrentQuantitiesByInventory(order)
  const availability = getEggAdjustAvailability(order)
  const nextState: Record<string, EggAdjustState> = {}

  for (const inventoryRow of getEggAdjustInventoryRows(order)) {
    const inventoryId = String(inventoryRow?.id || '').trim()
    if (!inventoryId) continue
    const currentQty = quantitiesByInventory.get(inventoryId) || 0
    const availabilityEntry = availability[inventoryId]
    nextState[inventoryId] = {
      quantity: currentQty,
      overrideRemaining: availabilityEntry?.manualOverride
        ? String(Math.max(0, Number(availabilityEntry.eggsAvailable || 0) - Number(availabilityEntry.eggsAllocated || 0)))
        : '',
    }
  }

  return nextState
}

function getEggOutstandingRemainderOre(order: any): number {
  const remainderTargetOre = Number(order?.remainder_amount || 0)
  const remainderPaidOre = (order?.egg_payments || []).reduce((sum: number, payment: EggPaymentLike) => {
    if (payment?.payment_type !== 'remainder' || payment?.status !== 'completed') return sum
    return sum + Math.round(Number(payment?.amount_nok || 0) * 100)
  }, 0)

  return Math.max(0, remainderTargetOre - remainderPaidOre)
}

function getChickenOutstandingRemainderNok(order: any): number {
  const remainderTargetNok = Math.round(Number(order?.remainder_amount_nok || 0))
  const remainderPaidNok = (order?.chicken_payments || []).reduce((sum: number, payment: any) => {
    if (payment?.payment_type !== 'remainder' || payment?.status !== 'completed') return sum
    return sum + Math.round(Number(payment?.amount_nok || 0))
  }, 0)

  return Math.max(0, remainderTargetNok - remainderPaidNok)
}

function getChickenAdditionAgeWeeks(order: any, addition: any): number | null {
  const explicitAge = Number(addition?.age_weeks_at_pickup || 0)
  if (Number.isFinite(explicitAge) && explicitAge > 0) {
    return explicitAge
  }

  const hatchDate = String(addition?.chicken_hatches?.hatch_date || '').trim()
  const pickupMonday = String(order?.pickup_monday || '').trim()
  if (!hatchDate || !pickupMonday) return null

  const hatch = new Date(`${hatchDate}T12:00:00`)
  const pickup = new Date(`${pickupMonday}T12:00:00`)
  if (Number.isNaN(hatch.getTime()) || Number.isNaN(pickup.getTime())) return null

  const diffMs = pickup.getTime() - hatch.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return null
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

function getChickenAdjustLineItems(order: any): ChickenAdjustLineItem[] {
  const lines: ChickenAdjustLineItem[] = []

  lines.push({
    key: 'main',
    kind: 'main',
    hatchId: String(order?.hatch_id || '').trim(),
    breedName: String(order?.chicken_breeds?.name || '—').trim() || '—',
    breedSlug: String(order?.chicken_breeds?.slug || '').trim() || null,
    ageWeeks: Number.isFinite(Number(order?.age_weeks_at_pickup)) ? Number(order.age_weeks_at_pickup) : null,
    currentHens: Math.max(0, Number(order?.quantity_hens || 0)),
    currentRoosters: Math.max(0, Number(order?.quantity_roosters || 0)),
    pricePerHen: Math.max(0, Number(order?.price_per_hen_nok || 0)),
    pricePerRooster: Math.max(0, Number(order?.price_per_rooster_nok || 0)),
    systemFreeHens: Math.max(0, Number(order?.chicken_hatches?.available_hens || 0)),
    systemFreeRoosters: Math.max(0, Number(order?.chicken_hatches?.available_roosters || 0)),
  })

  for (const addition of order?.chicken_order_additions || []) {
    lines.push({
      key: String(addition?.id || '').trim(),
      kind: 'addition',
      hatchId: String(addition?.hatch_id || '').trim(),
      breedName: String(addition?.chicken_breeds?.name || '—').trim() || '—',
      breedSlug: String(addition?.chicken_breeds?.slug || '').trim() || null,
      ageWeeks: getChickenAdditionAgeWeeks(order, addition),
      currentHens: Math.max(0, Number(addition?.quantity_hens || 0)),
      currentRoosters: Math.max(0, Number(addition?.quantity_roosters || 0)),
      pricePerHen: Math.max(0, Number(addition?.price_per_hen_nok || 0)),
      pricePerRooster: Math.max(
        0,
        Number(addition?.price_per_rooster_nok || addition?.chicken_breeds?.rooster_price_nok || 0)
      ),
      systemFreeHens: Math.max(0, Number(addition?.chicken_hatches?.available_hens || 0)),
      systemFreeRoosters: Math.max(0, Number(addition?.chicken_hatches?.available_roosters || 0)),
    })
  }

  return lines
}

function getDisplayStatus(order: any, type?: OrderType): string {
  const currentStatus = String(order?.status || '').trim()
  if (type !== 'egg') return currentStatus || '—'

  if (['preparing', 'shipped', 'delivered', 'cancelled', 'forfeited'].includes(currentStatus)) {
    return currentStatus
  }

  const depositPaid = (order?.egg_payments || []).some(
    (payment: EggPaymentLike) => payment?.payment_type === 'deposit' && payment?.status === 'completed'
  )

  if (!depositPaid) return currentStatus || 'pending'
  if (getEggOutstandingRemainderOre(order) <= 0) return 'fully_paid'
  return currentStatus || 'deposit_paid'
}

function resolveCustomerLookupId(order: any, type?: OrderType): string | null {
  if (!order || !type) return null

  const email = String(order.customer_email || '').trim().toLowerCase()
  const phoneDigits = String(order.customer_phone || '').replace(/\D+/g, '')
  const userId = String(order.user_id || '').trim()

  let customerId = ''
  if (email && email !== 'pending@vipps.no') {
    customerId = `email:${email}`
  } else if (phoneDigits) {
    customerId = `phone:${phoneDigits}`
  } else if (userId) {
    customerId = `user:${userId}`
  } else if (order.id) {
    customerId = `order:${type}:${order.id}`
  }

  return customerId || null
}

// ─── helper components ────────────────────────────────────────────────────────

function SectionToggle({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <span className="text-sm font-medium text-neutral-800">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-neutral-100 px-5 py-4">{children}</div>
      )}
    </div>
  )
}

function BirdAdjustLine({
  label,
  subLabel,
  currentHens,
  currentRoosters,
  hensDelta,
  roostersDelta,
  onHensDelta,
  onRoostersDelta,
  ageWeeks,
  breedSlug,
}: AdjustBirdLine) {
  const no = useIsNorwegian()
  const sexed = isBirdSexed(ageWeeks, breedSlug)

  if (!sexed) {
    const totalCurrent = currentHens + currentRoosters
    const totalDelta = hensDelta
    return (
      <div className="rounded border border-neutral-200 p-3 space-y-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-neutral-500">{subLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-16">{no ? 'Kyllinger' : 'Chicks'}</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onHensDelta(hensDelta - 1)} disabled={totalCurrent + totalDelta <= 0}>−</Button>
          <span className={`w-10 text-center text-sm font-medium ${totalDelta !== 0 ? (totalDelta > 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
            {totalCurrent + totalDelta}
            {totalDelta !== 0 && <span className="text-xs"> ({totalDelta > 0 ? '+' : ''}{totalDelta})</span>}
          </span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onHensDelta(hensDelta + 1)}>+</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded border border-neutral-200 p-3 space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-neutral-500">{subLabel}</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-12">{no ? 'Høner' : 'Hens'}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onHensDelta(hensDelta - 1)}
            disabled={currentHens + hensDelta <= 0}
          >
            −
          </Button>
          <span
            className={`w-10 text-center text-sm font-medium ${hensDelta !== 0 ? (hensDelta > 0 ? 'text-green-700' : 'text-red-700') : ''}`}
          >
            {currentHens + hensDelta}
            {hensDelta !== 0 && (
              <span className="text-xs"> ({hensDelta > 0 ? '+' : ''}{hensDelta})</span>
            )}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onHensDelta(hensDelta + 1)}
          >
            +
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-12">{no ? 'Haner' : 'Roosters'}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onRoostersDelta(roostersDelta - 1)}
            disabled={currentRoosters + roostersDelta <= 0}
          >
            −
          </Button>
          <span
            className={`w-10 text-center text-sm font-medium ${roostersDelta !== 0 ? (roostersDelta > 0 ? 'text-green-700' : 'text-red-700') : ''}`}
          >
            {currentRoosters + roostersDelta}
            {roostersDelta !== 0 && (
              <span className="text-xs"> ({roostersDelta > 0 ? '+' : ''}{roostersDelta})</span>
            )}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onRoostersDelta(roostersDelta + 1)}
          >
            +
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── main modal ────────────────────────────────────────────────────────────────

interface Props {
  order: PickupOrder | null
  onClose: () => void
  onRefresh: () => void
  onNavigateToCustomer?: (customerId: string) => void
}

export function PickupFulfillmentModal({ order, onClose, onRefresh, onNavigateToCustomer }: Props) {
  const { toast } = useToast()
  const { lang } = useLanguage()
  const no = lang === 'no'
  const open = !!order

  // ── full order data ────────────────────────────────────────────────────────
  const [fullOrder, setFullOrder] = useState<any>(null)
  const [fetchLoading, setFetchLoading] = useState(false)

  // ── section open state ─────────────────────────────────────────────────────
  const [sectionPickup, setSectionPickup] = useState(true)
  const [sectionAdjust, setSectionAdjust] = useState(false)
  const [sectionPayment, setSectionPayment] = useState(false)

  // ── pickup day state ───────────────────────────────────────────────────────
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState<'11:00' | '17:00'>('11:00')
  const [pickupDaySaving, setPickupDaySaving] = useState(false)
  const [reminderSending, setReminderSending] = useState(false)

  // ── chicken demand summary state ───────────────────────────────────────────
  type DemandRow = { hatch_id: string; breed_id: string; breed_name: string; hatch_date: string; available_hens: number; available_roosters: number; demanded_hens: number; demanded_roosters: number; order_count: number }
  const [demandSummary, setDemandSummary] = useState<DemandRow[]>([])
  const [demandLoading, setDemandLoading] = useState(false)
  const [demandError, setDemandError] = useState<string | null>(null)

  useEffect(() => {
    if (!sectionAdjust || order?.type !== 'chicken') return
    let active = true
    setDemandLoading(true)
    setDemandError(null)
    fetch('/api/admin/chickens/demand-summary')
      .then((r) => r.json())
      .then((json) => {
        if (!active) return
        if (json.error) setDemandError(json.error)
        else setDemandSummary(json.rows || [])
      })
      .catch((err) => { if (active) setDemandError(err?.message || 'Fetch failed') })
      .finally(() => { if (active) setDemandLoading(false) })
    return () => { active = false }
  }, [sectionAdjust, order?.type])

  // ── chicken bird adjustment state ──────────────────────────────────────────
  const [birdStep, setBirdStep] = useState<'edit' | 'pool' | 'confirm'>('edit')
  const [adjustDeltas, setAdjustDeltas] = useState<Record<string, BirdAdjustmentState>>({})
  const [poolReturns, setPoolReturns] = useState<Record<string, BirdPoolReturnState>>({})
  const [birdHatchOverrides, setBirdHatchOverrides] = useState<Record<string, ChickenHatchOverrideState>>({})
  const [birdNote, setBirdNote] = useState('')
  const [birdSaving, setBirdSaving] = useState(false)

  // ── egg quantity adjustment state ──────────────────────────────────────────
  const [eggQtyDelta, setEggQtyDelta] = useState(0)
  const [eggAdjustments, setEggAdjustments] = useState<Record<string, EggAdjustState>>({})
  const [eggSaving, setEggSaving] = useState(false)

  // ── pig box/extras adjustment state ────────────────────────────────────────
  const [pigBoxSize, setPigBoxSize] = useState<number | null>(null)
  const [pigMangalitsaPresetId, setPigMangalitsaPresetId] = useState<string | null>(null)
  const [pigExtraIds, setPigExtraIds] = useState<string[]>([])
  const [pigNote, setPigNote] = useState('')
  const [pigSaving, setPigSaving] = useState(false)
  // catalog
  const [boxConfigs, setBoxConfigs] = useState<{ box_size: number; price: number }[]>([])
  const [extrasOptions, setExtrasOptions] = useState<{ id: string; name_no: string; price_nok: number }[]>([])
  const [mangalitsaPresets, setMangalitsaPresets] = useState<{ id: string; name_no: string; price_nok: number }[]>([])

  // ── payment state ──────────────────────────────────────────────────────────
  const [paymentSending, setPaymentSending] = useState(false)

  // ── confirm pickup state ───────────────────────────────────────────────────
  const [confirmingPickup, setConfirmingPickup] = useState(false)

  // ─── fetch full order on open ─────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    if (!order) return
    setFetchLoading(true)
    try {
      let url: string
      if (order.type === 'egg') {
        url = `/api/admin/eggs/orders/${order.id}`
      } else if (order.type === 'chicken') {
        url = `/api/admin/chickens/orders/${order.id}`
      } else {
        url = `/api/admin/orders/${order.id}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch order')
      const data = await res.json()

      if (order.type === 'pig') {
        setFullOrder(data.order)
        setBoxConfigs(data.boxConfigs || [])
        setExtrasOptions(data.extrasOptions || [])
        setMangalitsaPresets(data.mangalitsaPresets || [])
        // Init pig state from order
        setPigBoxSize(data.order.box_size ?? null)
        setPigMangalitsaPresetId(data.order.mangalitsa_preset_id ?? null)
        const currentExtraIds = (data.order.order_extras || []).map((e: any) => e.extra_id as string)
        setPigExtraIds(currentExtraIds)
      } else {
        setFullOrder(data)
      }

      // Init pickup day from fetched data
      const fo = order.type === 'pig' ? data.order : data
      setPickupDate(fo.pickup_date || '')
      setPickupTime((fo.pickup_time as '11:00' | '17:00') || '11:00')

      // Init chicken deltas
      if (order.type === 'chicken') {
        const initial: Record<string, BirdAdjustmentState> = {}
        initial['main'] = { hensDelta: 0, roostersDelta: 0 }
        for (const addition of (data.chicken_order_additions || [])) {
          initial[addition.id] = { hensDelta: 0, roostersDelta: 0 }
        }
        setAdjustDeltas(initial)
        setPoolReturns({})
        setBirdHatchOverrides({})
        setBirdStep('edit')
        setBirdNote('')
      }

      // Init egg delta
      if (order.type === 'egg') {
        setEggAdjustments(buildEggAdjustInitialState(fo))
      }
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message || (no ? 'Kunne ikke hente bestilling' : 'Failed to load order'), variant: 'destructive' })
    } finally {
      setFetchLoading(false)
    }
  }, [order, toast])

  useEffect(() => {
    if (open) {
      setFullOrder(null)
      setSectionPickup(true)
      setSectionAdjust(false)
      setSectionPayment(false)
      fetchOrder()
    }
  }, [open, fetchOrder])

  // ─── pickup day helpers ───────────────────────────────────────────────────

  const savePickupDay = async () => {
    if (!order || !pickupDate) return
    setPickupDaySaving(true)
    try {
      let url: string
      let body: Record<string, string>

      if (order.type === 'pig') {
        url = `/api/admin/orders/${order.id}/pickup-date`
        body = { pickupDate, pickupTime }
      } else if (order.type === 'chicken') {
        url = `/api/admin/chickens/orders/${order.id}`
        body = { pickupDate, pickupTime }
      } else {
        url = `/api/admin/eggs/orders/${order.id}`
        body = { pickupDate, pickupTime }
      }

      const method = order.type === 'pig' ? 'PATCH' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || (no ? 'Feil ved lagring' : 'Save failed'))
      }
      toast({ title: no ? 'Lagret' : 'Saved', description: no ? 'Hentedag oppdatert.' : 'Pickup day updated.' })
      await fetchOrder()
      onRefresh()
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setPickupDaySaving(false)
    }
  }

  const sendReminder = async () => {
    if (!order) return
    setReminderSending(true)
    try {
      let url: string
      if (order.type === 'egg') {
        url = `/api/admin/eggs/orders/${order.id}/send-pickup-email`
      } else if (order.type === 'chicken') {
        url = `/api/admin/chickens/orders/${order.id}/send-pickup-email`
      } else {
        url = `/api/admin/orders/${order.id}/send-pickup-email`
      }
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || (no ? 'Feil ved sending' : 'Failed to send'))
      }
      toast({ title: no ? 'E-post sendt' : 'Email sent', description: no ? 'Påminnelse om hentedag er sendt.' : 'Pickup day reminder sent.' })
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setReminderSending(false)
    }
  }

  // ─── chicken bird adjustment helpers ──────────────────────────────────────

  const updateBirdHatchOverride = (
    hatchId: string,
    field: keyof ChickenHatchOverrideState,
    nextValue: string
  ) => {
    setBirdHatchOverrides((prev) => {
      const existing = prev[hatchId] || { hensFreeNow: '', roostersFreeNow: '' }
      return {
        ...prev,
        [hatchId]: {
          ...existing,
          [field]: nextValue,
        },
      }
    })
  }

  const birdHasSubtractions = () =>
    Object.values(adjustDeltas).some((d) => d.hensDelta < 0 || d.roostersDelta < 0)

  const birdHasChanges = () =>
    Object.values(adjustDeltas).some((d) => d.hensDelta !== 0 || d.roostersDelta !== 0)

  const handleBirdNext = () => {
    if (birdStep === 'edit') {
      if (birdHasSubtractions()) {
        const returns: Record<string, { poolHensReturn: number; poolRoostersReturn: number }> = {}
        for (const [key, delta] of Object.entries(adjustDeltas)) {
          if (delta.hensDelta < 0 || delta.roostersDelta < 0) {
            returns[key] = { poolHensReturn: 0, poolRoostersReturn: 0 }
          }
        }
        setPoolReturns(returns)
        setBirdStep('pool')
      } else {
        setBirdStep('confirm')
      }
    } else if (birdStep === 'pool') {
      setBirdStep('confirm')
    }
  }

  const handleBirdBack = () => {
    if (birdStep === 'pool') setBirdStep('edit')
    else if (birdStep === 'confirm') {
      if (birdHasSubtractions()) setBirdStep('pool')
      else setBirdStep('edit')
    }
  }

  const submitBirds = async () => {
    if (!fullOrder) return
    setBirdSaving(true)
    try {
      const lineItems = getChickenAdjustLineItems(fullOrder)
      const hatchOverrides = Array.from(
        new Set(lineItems.map((line) => line.hatchId).filter((hatchId) => Boolean(hatchId)))
      )
        .map((hatchId) => {
          const override = birdHatchOverrides[hatchId] || { hensFreeNow: '', roostersFreeNow: '' }
          const trimmedHens = String(override.hensFreeNow || '').trim()
          const trimmedRoosters = String(override.roostersFreeNow || '').trim()
          return {
            hatchId,
            hensFreeNow: trimmedHens === '' ? null : Number(trimmedHens),
            roostersFreeNow: trimmedRoosters === '' ? null : Number(trimmedRoosters),
          }
        })
        .filter((entry) => entry.hensFreeNow !== null || entry.roostersFreeNow !== null)

      const adjustments = Object.entries(adjustDeltas)
        .filter(([, d]) => d.hensDelta !== 0 || d.roostersDelta !== 0)
        .map(([key, d]) => {
          const isMain = key === 'main'
          const pr = poolReturns[key] || { poolHensReturn: 0, poolRoostersReturn: 0 }
          return {
            type: isMain ? 'main' : 'addition',
            additionId: isMain ? null : key,
            hensDelta: d.hensDelta,
            roostersDelta: d.roostersDelta,
            poolHensReturn: d.hensDelta < 0 ? pr.poolHensReturn : 0,
            poolRoostersReturn: d.roostersDelta < 0 ? pr.poolRoostersReturn : 0,
          }
        })

      const res = await fetch(`/api/admin/chickens/orders/${fullOrder.id}/adjust-birds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments, hatchOverrides, adminNote: birdNote }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || (no ? 'Feil ved justering' : 'Adjustment failed'))

      toast({ title: no ? 'Bestilling oppdatert' : 'Order updated', description: no ? 'Antall fugler justert.' : 'Bird count adjusted.' })
      setBirdStep('edit')
      setBirdNote('')
      setBirdHatchOverrides({})
      await fetchOrder()
      onRefresh()
      if (getChickenOutstandingRemainderNok(result?.order) > 0) {
        setSectionPayment(true)
      }
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setBirdSaving(false)
    }
  }

  // ─── egg adjustment helper ─────────────────────────────────────────────────

  const submitEggQty = async () => {
    if (!fullOrder || eggQtyDelta === 0) return
    setEggSaving(true)
    try {
      const newQty = Number(fullOrder.quantity) + eggQtyDelta
      if (newQty <= 0) throw new Error(no ? 'Antall kan ikke være 0 eller negativt' : 'Quantity cannot be 0 or negative')
      const res = await fetch(`/api/admin/eggs/orders/${fullOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || (no ? 'Feil ved oppdatering' : 'Update failed'))
      toast({ title: no ? 'Oppdatert' : 'Updated', description: no ? `Antall egg endret til ${newQty}.` : `Egg count changed to ${newQty}.` })
      setEggQtyDelta(0)
      await fetchOrder()
      onRefresh()
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setEggSaving(false)
    }
  }

  // ─── pig adjustment helper ─────────────────────────────────────────────────

  const updateEggLineQuantity = (inventoryId: string, nextQuantity: number) => {
    setEggAdjustments((prev) => {
      const existing = prev[inventoryId] || { quantity: 0, overrideRemaining: '' }
      return {
        ...prev,
        [inventoryId]: {
          ...existing,
          quantity: Math.max(0, Math.round(nextQuantity)),
        },
      }
    })
  }

  const updateEggOverrideRemaining = (inventoryId: string, nextValue: string) => {
    setEggAdjustments((prev) => {
      const existing = prev[inventoryId] || { quantity: 0, overrideRemaining: '' }
      return {
        ...prev,
        [inventoryId]: {
          ...existing,
          overrideRemaining: nextValue,
        },
      }
    })
  }

  const submitEggAdjustments = async () => {
    if (!fullOrder) return
    setEggSaving(true)
    try {
      const payloadLines = getEggAdjustInventoryRows(fullOrder).map((inventoryRow) => {
        const inventoryId = String(inventoryRow?.id || '').trim()
        const adjustment = eggAdjustments[inventoryId] || { quantity: 0, overrideRemaining: '' }
        const trimmedOverride = String(adjustment.overrideRemaining || '').trim()

        return {
          inventoryId,
          quantity: Math.max(0, Math.round(Number(adjustment.quantity || 0))),
          overrideRemaining: trimmedOverride === '' ? null : Number(trimmedOverride),
        }
      })

      if (!payloadLines.some((line) => line.quantity > 0)) {
        throw new Error(no ? 'Bestillingen må ha minst én eggrase med antall over 0' : 'Order must have at least one egg breed with quantity above 0')
      }

      const res = await fetch(`/api/admin/eggs/orders/${fullOrder.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_order_lines',
          data: { lines: payloadLines },
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || (no ? 'Feil ved oppdatering' : 'Update failed'))

      toast({
        title: no ? 'Oppdatert' : 'Updated',
        description: no ? 'Egglinjene og lagerreservasjonen er oppdatert.' : 'Egg lines and inventory updated.',
      })
      await fetchOrder()
      onRefresh()
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setEggSaving(false)
    }
  }

  const submitPigAdjust = async () => {
    if (!fullOrder) return
    setPigSaving(true)
    try {
      const body: Record<string, any> = { extraIds: pigExtraIds, adminNote: pigNote }
      if (pigMangalitsaPresetId) {
        body.mangalitsaPresetId = pigMangalitsaPresetId
      } else if (pigBoxSize) {
        body.boxSize = pigBoxSize
      }

      const res = await fetch(`/api/admin/orders/${fullOrder.id}/adjust-box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || (no ? 'Feil ved oppdatering' : 'Update failed'))
      toast({ title: no ? 'Oppdatert' : 'Updated', description: no ? 'Boks og tilbehør lagret.' : 'Box and extras saved.' })
      setPigNote('')
      await fetchOrder()
      onRefresh()
      // Open payment section if there's a new remainder
      if (result.newRemainder > 0) setSectionPayment(true)
    } catch (err: any) {
      toast({ title: 'Feil', description: err.message, variant: 'destructive' })
    } finally {
      setPigSaving(false)
    }
  }

  // ─── payment helper ────────────────────────────────────────────────────────

  const sendPaymentRequest = async () => {
    if (!order || !fullOrder) return
    setPaymentSending(true)
    try {
      let res: Response

      if (order.type === 'chicken') {
        res = await fetch(`/api/admin/chickens/orders/${fullOrder.id}/enable-remainder`, {
          method: 'POST',
        })
      } else {
        const customerEmail = fullOrder.customer_email
        const orderNumber = fullOrder.order_number || order.order_number
        const productType = order.type === 'egg' ? 'eggs' : 'pigs'

        res = await fetch('/api/admin/deferred-payments/request-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: fullOrder.id,
            productType,
            customerName: fullOrder.customer_name,
            customerEmail,
            orderNumber,
          }),
        })
      }

      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || (no ? 'Feil ved sending' : 'Failed to send'))

      if (order.type === 'chicken') {
        const enabledTitle = no ? 'Restbetaling aktivert' : 'Remainder payment enabled'
        const enabledDescription = result?.alreadyEnabled
          ? (no ? 'Restbetaling var allerede aktivert på Min side.' : 'Remainder payment was already enabled on Min side.')
          : result?.emailSent
            ? (no ? 'Restbetaling er aktivert, og kunden har fått e-post om å betale på Min side.' : 'Remainder payment is enabled and the customer was emailed to pay on Min side.')
            : (no ? 'Restbetaling er aktivert på Min side.' : 'Remainder payment is enabled on Min side.')
        toast({ title: enabledTitle, description: enabledDescription })
        await fetchOrder()
        onRefresh()
        setSectionPayment(true)
      } else {
        const customerEmail = fullOrder.customer_email
        toast({
          title: no ? 'Betalingslenke sendt' : 'Payment link sent',
          description: no ? `E-post sendt til ${customerEmail}.` : `Email sent to ${customerEmail}.`,
        })
      }
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setPaymentSending(false)
    }
  }

  // ─── disable remainder payment ───────────────────────────────────────────

  const [remainderDisabling, setRemainderDisabling] = useState(false)

  const disableRemainder = async () => {
    if (!order || !fullOrder) return
    setRemainderDisabling(true)
    try {
      const res = await fetch(`/api/admin/chickens/orders/${fullOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainderPaymentEnabled: false }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result?.error || (no ? 'Kunne ikke deaktivere restbetaling' : 'Could not disable remainder payment'))
      }
      toast({
        title: no ? 'Restbetaling deaktivert' : 'Remainder payment disabled',
        description: no ? 'Kunden kan ikke lenger betale restbeløpet via Min side.' : 'The customer can no longer pay the remainder via Min side.',
      })
      await fetchOrder()
      onRefresh()
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setRemainderDisabling(false)
    }
  }

  // ─── confirm pickup ───────────────────────────────────────────────────────

  const confirmPickup = async () => {
    if (!order || !fullOrder) return
    setConfirmingPickup(true)
    try {
      let url: string
      let body: Record<string, unknown>
      const targetId = String(fullOrder.id || order.id || '').trim()

      if (!targetId) {
        throw new Error(no ? 'Kunne ikke finne bestillings-ID' : 'Could not find order ID')
      }

      if (order.type === 'egg') {
        url = `/api/admin/eggs/orders/${targetId}`
        body = { markDelivered: true }
      } else if (order.type === 'chicken') {
        url = `/api/admin/chickens/orders/${targetId}`
        body = { status: 'picked_up' }
      } else {
        url = `/api/admin/orders/${targetId}`
        body = { markDelivered: true }
      }

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || (no ? 'Kunne ikke oppdatere status' : 'Could not update status'))
      }
      const label = order.type === 'chicken'
        ? (no ? 'hentet' : 'picked up')
        : order.type === 'pig'
          ? (no ? 'fullført' : 'completed')
          : (no ? 'levert' : 'delivered')
      toast({ title: no ? 'Henting bekreftet' : 'Pickup confirmed', description: no ? `Bestillingen er markert som ${label}.` : `Order marked as ${label}.` })
      onRefresh()
      onClose()
    } catch (err: any) {
      toast({ title: no ? 'Feil' : 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setConfirmingPickup(false)
    }
  }

  // ─── derived values ────────────────────────────────────────────────────────

  const pickupDayIsSet = !!(fullOrder?.pickup_date)

  const remainder = (() => {
    if (!fullOrder) return 0
    if (order?.type === 'egg') return getEggOutstandingRemainderOre(fullOrder)
    if (order?.type === 'chicken') return getChickenOutstandingRemainderNok(fullOrder)
    if (order?.type === 'pig') return Number(fullOrder.remainder_amount || 0)
    return 0
  })()

  const formatMoney = (n: number) => {
    const normalized = order?.type === 'egg' ? Number(n || 0) / 100 : Number(n || 0)
    return `kr ${Math.round(normalized).toLocaleString('nb-NO')}`
  }

  const displayStatus = fullOrder ? getDisplayStatus(fullOrder, order?.type) : (order?.status || '—')
  const customerLookupId = fullOrder ? resolveCustomerLookupId(fullOrder, order?.type) : null
  const paymentSummaryOrder =
    fullOrder && order?.type === 'egg'
      ? { ...fullOrder, remainder_amount: remainder }
      : fullOrder && order?.type === 'chicken'
        ? { ...fullOrder, remainder_amount_nok: remainder }
        : fullOrder

  const chickenRemainderEnabled = order?.type === 'chicken' && fullOrder?.remainder_payment_enabled === true
  const chickenNeedsRemainderBeforePickup = order?.type === 'chicken' && remainder > 0

  const navigateToCustomerProfile = () => {
    if (!customerLookupId) return

    if (onNavigateToCustomer) {
      onClose()
      onNavigateToCustomer(customerLookupId)
      return
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      params.set('tab', 'customers')
      params.set('subTab', 'database')
      params.set('customerId', customerLookupId)
      window.location.href = `/admin?${params.toString()}`
    }
  }

  const formatPickupDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString(no ? 'nb-NO' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

  // ─── type badge ───────────────────────────────────────────────────────────
  const typeBadge =
    order?.type === 'egg'
      ? 'bg-blue-100 text-blue-800'
      : order?.type === 'chicken'
        ? 'bg-green-100 text-green-800'
        : 'bg-amber-100 text-amber-800'

  const typeLabel =
    order?.type === 'egg'
      ? (no ? 'Rugeegg' : 'Hatching eggs')
      : order?.type === 'chicken'
        ? (no ? 'Kylling' : 'Chicken')
        : (no ? 'Gris' : 'Pig')

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{order?.order_number}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-normal ${typeBadge}`}>
              {typeLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        {fetchLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        )}

        {!fetchLoading && fullOrder && (
          <div className="space-y-3 mt-2">

            {/* Customer overview */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 space-y-1.5">
              <div className="flex items-start gap-2 text-sm">
                <User className="w-4 h-4 text-neutral-400 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  {customerLookupId ? (
                    <button
                      type="button"
                      onClick={navigateToCustomerProfile}
                      className="font-medium text-left text-neutral-900 hover:text-blue-700 hover:underline transition-colors"
                    >
                      {fullOrder.customer_name}
                    </button>
                  ) : (
                    <p className="font-medium text-neutral-900">{fullOrder.customer_name}</p>
                  )}
                  {fullOrder.customer_email && (
                    <p className="text-neutral-500 text-xs break-all">{fullOrder.customer_email}</p>
                  )}
                  {fullOrder.customer_phone && (
                    <p className="text-xs text-neutral-500">{fullOrder.customer_phone}</p>
                  )}
                </div>
              </div>
              {/* Order summary line */}
              <div className="flex items-start gap-2 text-sm pl-6">
                <Package className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <OrderSummaryLine order={fullOrder} type={order!.type} />
              </div>
              <div className="flex items-center gap-2 pl-6">
                <StatusBadge status={displayStatus} />
                {remainder > 0 && (
                  <span className="text-xs text-amber-700 font-medium">
                    {no ? 'Restbetaling' : 'Remainder'}: {formatMoney(remainder)}
                  </span>
                )}
              </div>
            </div>

            {/* ── Section: Hentedag ── */}
            <SectionToggle
              title={no ? 'Hentedag' : 'Pickup day'}
              open={sectionPickup}
              onToggle={() => setSectionPickup((v) => !v)}
            >
              <div className="space-y-4">
                {pickupDayIsSet ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="font-medium text-green-700">
                      {formatPickupDate(fullOrder.pickup_date!)} {no ? 'kl.' : 'at'} {fullOrder.pickup_time || '—'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{no ? 'Hentedag ikke valgt av kunde' : 'Pickup day not chosen by customer'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto shrink-0"
                      onClick={sendReminder}
                      disabled={reminderSending}
                    >
                      {reminderSending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Mail className="w-3 h-3 mr-1" />
                      )}
                      {no ? 'Send påminnelse' : 'Send reminder'}
                    </Button>
                  </div>
                )}

                {/* Pickup day editor */}
                <div className="border-t border-neutral-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    {pickupDayIsSet ? (no ? 'Endre hentedag' : 'Change pickup day') : (no ? 'Velg hentedag' : 'Set pickup day')}
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500 mb-1 block">{no ? 'Dato' : 'Date'}</label>
                      <Input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">{no ? 'Tid' : 'Time'}</label>
                      <div className="flex gap-2">
                        {(['11:00', '17:00'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setPickupTime(t)}
                            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                              pickupTime === t
                                ? 'bg-neutral-900 text-white border-neutral-900'
                                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={savePickupDay}
                      disabled={!pickupDate || pickupDaySaving}
                      className="shrink-0"
                    >
                      {pickupDaySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {no ? 'Lagre' : 'Save'}
                    </Button>
                  </div>
                  {pickupDayIsSet && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={sendReminder}
                      disabled={reminderSending}
                    >
                      {reminderSending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Mail className="w-3 h-3 mr-1" />
                      )}
                      {no ? 'Send påminnelse på e-post' : 'Send email reminder'}
                    </Button>
                  )}
                </div>
              </div>
            </SectionToggle>

            {/* ── Section: Juster bestilling ── */}
            <SectionToggle
              title={no ? 'Juster bestilling' : 'Adjust order details'}
              open={sectionAdjust}
              onToggle={() => setSectionAdjust((v) => !v)}
            >
              {order?.type === 'egg' && (
                <EggAdjustPanel
                  fullOrder={fullOrder}
                  adjustments={eggAdjustments}
                  onQuantityChange={updateEggLineQuantity}
                  onOverrideRemainingChange={updateEggOverrideRemaining}
                  onSave={submitEggAdjustments}
                  saving={eggSaving}
                />
              )}

              {order?.type === 'chicken' && (
                <ChickenAdjustPanel
                  fullOrder={fullOrder}
                  step={birdStep}
                  adjustDeltas={adjustDeltas}
                  poolReturns={poolReturns}
                  hatchOverrides={birdHatchOverrides}
                  note={birdNote}
                  onNoteChange={setBirdNote}
                  onDeltaChange={setAdjustDeltas}
                  onPoolChange={setPoolReturns}
                  onHatchOverrideChange={updateBirdHatchOverride}
                  hasChanges={birdHasChanges()}
                  hasSubtractions={birdHasSubtractions()}
                  onNext={handleBirdNext}
                  onBack={handleBirdBack}
                  onSubmit={submitBirds}
                  saving={birdSaving}
                  formatMoney={formatMoney}
                  demandSummary={demandSummary}
                  demandLoading={demandLoading}
                  demandError={demandError}
                  onAddBreed={async (hatchId, quantityHens, quantityRoosters, ageWeeksAtPickup) => {
                    const res = await fetch(`/api/admin/chickens/orders/${fullOrder.id}/add-addition`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hatchId, quantityHens, quantityRoosters, ageWeeksAtPickup }),
                    })
                    const json = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(json?.error || (no ? 'Kunne ikke legge til rase' : 'Could not add breed'))
                    await fetchOrder()
                    onRefresh()
                    setDemandSummary([]) // triggers refetch on next render
                  }}
                />
              )}

              {order?.type === 'pig' && (
                <PigAdjustPanel
                  fullOrder={fullOrder}
                  boxConfigs={boxConfigs}
                  extrasOptions={extrasOptions}
                  mangalitsaPresets={mangalitsaPresets}
                  boxSize={pigBoxSize}
                  mangalitsaPresetId={pigMangalitsaPresetId}
                  extraIds={pigExtraIds}
                  note={pigNote}
                  onBoxSize={(v) => { setPigBoxSize(v); setPigMangalitsaPresetId(null) }}
                  onMangalitsaPreset={(v) => { setPigMangalitsaPresetId(v); setPigBoxSize(null) }}
                  onExtraIds={setPigExtraIds}
                  onNote={setPigNote}
                  onSave={submitPigAdjust}
                  saving={pigSaving}
                  formatMoney={formatMoney}
                />
              )}
            </SectionToggle>

            {/* ── Section: Betaling ── */}
            <SectionToggle
              title={no ? `Betaling${remainder > 0 ? ` – ${formatMoney(remainder)} gjenstår` : ''}` : `Payment${remainder > 0 ? ` – ${formatMoney(remainder)} remaining` : ''}`}
              open={sectionPayment}
              onToggle={() => setSectionPayment((v) => !v)}
            >
              <div className="space-y-4">
                <PaymentSummary
                  order={paymentSummaryOrder}
                  type={order!.type}
                  formatMoney={formatMoney}
                />
                {remainder > 0 && order?.type !== 'chicken' && (
                  <div className="border-t border-neutral-100 pt-4">
                    <p className="text-sm text-neutral-600 mb-3">
                      {no ? 'Send kunden en e-post med lenke til å betale restbeløpet via Vipps.' : 'Send the customer an email with a link to pay the remainder via Vipps.'}
                    </p>
                    <Button onClick={sendPaymentRequest} disabled={paymentSending}>
                      {paymentSending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      {no ? 'Send Vipps-betalingslenke' : 'Send Vipps payment link'}
                    </Button>
                  </div>
                )}
                {order?.type === 'chicken' && remainder > 0 && (
                  <div className="border-t border-neutral-100 pt-4">
                    <div className="space-y-3">
                      <p className="text-sm text-neutral-600">
                        {chickenRemainderEnabled
                          ? (no
                              ? 'Restbetalingen er aktivert på Min side. Kunden må betale der før henting kan bekreftes.'
                              : 'Remainder payment is enabled on Min side. The customer must pay there before pickup can be confirmed.')
                          : (no
                              ? 'Godkjenn restbetalingen for Min side etter at endringene er lagret. Kunden får e-post og kan betale derfra.'
                              : 'Approve the remainder payment for Min side after saving the changes. The customer will receive an email and can pay there.')}
                      </p>
                      {!chickenRemainderEnabled ? (
                        <Button onClick={sendPaymentRequest} disabled={paymentSending}>
                          {paymentSending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-2" />
                          )}
                          {no ? 'Aktiver restbetaling i Min side' : 'Enable remainder payment in Min side'}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              {no
                                ? 'Venter på at kunden betaler restbeløpet. Oppdater bestillingen når betalingen er registrert.'
                                : 'Waiting for the customer to pay the remainder. Refresh the order once the payment is registered.'}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={disableRemainder}
                            disabled={remainderDisabling}
                            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            {remainderDisabling ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {no ? 'Angre – deaktiver restbetaling' : 'Undo – disable remainder payment'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {remainder <= 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    {no ? 'Fullt betalt' : 'Fully paid'}
                  </div>
                )}
              </div>
            </SectionToggle>

            {/* ── Confirm pickup ── */}
            {(() => {
              const terminal = ['delivered', 'picked_up', 'completed', 'cancelled', 'forfeited']
              const alreadyDone = terminal.includes(displayStatus)
              if (alreadyDone) {
                return (
                  <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-medium">
                      {displayStatus === 'delivered' && (no ? 'Bestillingen er markert som levert' : 'The order has been marked as delivered')}
                      {displayStatus === 'picked_up' && (no ? 'Bestillingen er markert som hentet' : 'The order has been marked as picked up')}
                      {displayStatus === 'completed' && (no ? 'Bestillingen er fullført' : 'The order has been completed')}
                      {displayStatus === 'cancelled' && (no ? 'Bestillingen er kansellert' : 'The order has been cancelled')}
                      {displayStatus === 'forfeited' && (no ? 'Bestillingen er forkastet' : 'The order has been forfeited')}
                    </span>
                  </div>
                )
              }
              if (chickenNeedsRemainderBeforePickup) {
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-3">
                    <div className="flex items-start gap-2 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium">
                          {no
                            ? 'Restbeløpet må betales før henting kan bekreftes.'
                            : 'The remainder must be paid before pickup can be confirmed.'}
                        </p>
                        <p className="text-amber-800">
                          {chickenRemainderEnabled
                            ? (no
                                ? 'Kunden kan allerede betale på Min side. Vent til betalingen er registrert, så blir knappen aktiv.'
                                : 'The customer can already pay on Min side. Wait until the payment is registered and the button will unlock.')
                            : (no
                                ? 'Kunden får e-post og kan betale restbeløpet via Min side.'
                                : 'The customer will receive an email and can pay the remainder via Min side.')}
                        </p>
                      </div>
                    </div>
                    {!chickenRemainderEnabled && (
                      <Button
                        onClick={sendPaymentRequest}
                        disabled={paymentSending}
                        className="w-full"
                      >
                        {paymentSending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        {no ? 'Aktiver restbetaling' : 'Enable remainder payment'}
                      </Button>
                    )}
                  </div>
                )
              }
              const confirmLabel =
                order?.type === 'chicken'
                  ? (no ? 'Bekreft henting' : 'Confirm pickup')
                  : order?.type === 'pig'
                    ? (no ? 'Bekreft utlevering' : 'Confirm handoff')
                    : (no ? 'Bekreft henting' : 'Confirm pickup')
              return (
                <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
                  <p className="text-sm text-neutral-600 mb-3">
                    {no
                      ? 'Kunden har hentet bestillingen på gården. Klikk for å markere salget som fullført.'
                      : 'The customer has collected the order at the farm. Click to mark the sale as completed.'}
                  </p>
                  <Button
                    onClick={confirmPickup}
                    disabled={confirmingPickup}
                    className="w-full bg-green-700 hover:bg-green-800 text-white"
                  >
                    {confirmingPickup ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <PackageCheck className="w-4 h-4 mr-2" />
                    )}
                    {confirmLabel}
                  </Button>
                </div>
              )
            })()}

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── sub-panels ───────────────────────────────────────────────────────────────

function LegacyEggOrderSummaryBlock({
  breakdown,
  showAdjustmentHint = false,
}: {
  breakdown: EggOrderBreakdown
  showAdjustmentHint?: boolean
}) {
  const no = useIsNorwegian()

  return (
    <div className="w-full space-y-2 text-xs text-neutral-600">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-neutral-800">
          {breakdown.totalQuantity} {no ? 'egg totalt' : 'eggs total'}
        </span>
        <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5">
          {no ? 'Grunnbestilling' : 'Base order'} {breakdown.baseQuantity}
        </span>
        {breakdown.additionsQuantity > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
            {no ? 'Ekstra egg' : 'Extra eggs'} {breakdown.additionsQuantity}
          </span>
        )}
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        {breakdown.groupedLines.map((line) => (
          <div
            key={line.key}
            className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5"
          >
            <span className="truncate">{line.breedName}</span>
            <span className="font-medium text-neutral-800">
              {line.quantity} {no ? 'egg' : 'eggs'}
            </span>
          </div>
        ))}
      </div>
      {showAdjustmentHint && (
        <p className="text-neutral-500">
          {no
            ? 'Endringen under gjelder bare grunnbestillingen. Ekstra egg beholdes som de er.'
            : 'The change below applies only to the base order. Extra eggs stay as they are.'}
        </p>
      )}
    </div>
  )
}

function EggOrderSummaryBlock({
  breakdown,
  showAdjustmentHint = false,
}: {
  breakdown: EggOrderBreakdown
  showAdjustmentHint?: boolean
}) {
  const no = useIsNorwegian()

  return (
    <div className="w-full space-y-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Totalt' : 'Total'}</p>
          <p className="mt-1 font-semibold text-neutral-900">
            {breakdown.totalQuantity} {no ? 'egg' : 'eggs'}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Grunnbestilling' : 'Base order'}</p>
          <p className="mt-1 font-semibold text-neutral-900">
            {breakdown.baseQuantity} {no ? 'egg' : 'eggs'}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Ekstra egg' : 'Extra eggs'}</p>
          <p className="mt-1 font-semibold text-neutral-900">
            {breakdown.additionsQuantity} {no ? 'egg' : 'eggs'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          <span>{no ? 'Rase' : 'Breed'}</span>
          <span className="text-right">{no ? 'Antall' : 'Qty'}</span>
        </div>
        {breakdown.groupedLines.map((line, index) => (
          <div
            key={line.key}
            className={`grid grid-cols-[minmax(0,1fr)_90px] gap-3 px-3 py-2 text-sm ${index > 0 ? 'border-t border-neutral-100' : ''}`}
          >
            <span className="truncate text-neutral-700">{line.breedName}</span>
            <span className="text-right font-medium text-neutral-900">{line.quantity}</span>
          </div>
        ))}
      </div>

      {showAdjustmentHint && (
        <p className="text-xs text-neutral-500">
          {no
            ? 'Juster én rase per rad under. Lageret oppdateres når du lagrer.'
            : 'Adjust one breed per row below. Inventory updates when you save.'}
        </p>
      )}
    </div>
  )
}

function OrderSummaryLine({ order, type }: { order: any; type: OrderType }) {
  const no = useIsNorwegian()

  if (type === 'egg') {
    const breakdown = getEggOrderBreakdown(order)
    return <EggOrderSummaryBlock breakdown={breakdown} />
    return (
      <div className="w-full space-y-2 text-xs text-neutral-600">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-neutral-800">{breakdown.totalQuantity} egg totalt</span>
          <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5">
            Grunnbestilling {breakdown.baseQuantity}
          </span>
          {breakdown.additionsQuantity > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
              Ekstra egg {breakdown.additionsQuantity}
            </span>
          )}
        </div>
        <div className="grid gap-1 sm:grid-cols-2">
          {breakdown.groupedLines.map((line) => (
            <div
              key={line.key}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5"
            >
              {line.quantity} egg – {line.breedName}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (false) {
    const breed = order.egg_breeds?.name || ''
    return (
      <span className="text-xs text-neutral-600">
        {order.quantity} egg{breed ? ` – ${breed}` : ''}
      </span>
    )
  }
  if (type === 'chicken') {
    const breed = order.chicken_breeds?.name || ''
    const hens = Number(order.quantity_hens || 0)
    const roosters = Number(order.quantity_roosters || 0)
    const additions = (order.chicken_order_additions || []).length
    return (
      <span className="text-xs text-neutral-600">
        {hens} {no ? 'høner' : 'hens'} + {roosters} {no ? 'haner' : 'roosters'}
        {breed ? ` – ${breed}` : ''}
        {additions > 0 ? ` (+${additions} ${no ? 'tillegg' : 'additions'})` : ''}
      </span>
    )
  }
  if (type === 'pig') {
    if (order.is_mangalitsa) {
      return <span className="text-xs text-neutral-600">{no ? 'Mangalitsa' : 'Mangalitsa'}</span>
    }
    return <span className="text-xs text-neutral-600">{order.box_size ?? '?'}kg {no ? 'boks' : 'box'}</span>
  }
  return null
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    deposit_paid: 'bg-blue-100 text-blue-800',
    fully_paid: 'bg-green-100 text-green-800',
    ready_for_pickup: 'bg-purple-100 text-purple-800',
    picked_up: 'bg-gray-100 text-gray-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    preparing: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
  }
  const cls = colors[status || ''] || 'bg-neutral-100 text-neutral-700'
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${cls}`}>{status || '—'}</span>
  )
}

function PaymentSummary({
  order,
  type,
  formatMoney,
}: {
  order: any
  type: OrderType
  formatMoney: (n: number) => string
}) {
  const no = useIsNorwegian()
  const rows: { label: string; value: string; bold?: boolean; highlight?: boolean }[] = []

  if (type === 'egg') {
    rows.push({ label: no ? 'Totalt' : 'Total', value: formatMoney(Number(order.total_amount || 0)) })
    rows.push({ label: no ? 'Depositum betalt' : 'Deposit paid', value: formatMoney(Number(order.deposit_amount || 0)) })
    rows.push({
      label: no ? 'Restbeløp' : 'Remaining balance',
      value: formatMoney(Number(order.remainder_amount || 0)),
      bold: true,
      highlight: Number(order.remainder_amount || 0) > 0,
    })
  } else if (type === 'chicken') {
    rows.push({ label: no ? 'Totalt' : 'Total', value: formatMoney(Number(order.total_amount_nok || 0)) })
    rows.push({ label: no ? 'Depositum betalt' : 'Deposit paid', value: formatMoney(Number(order.deposit_amount_nok || 0)) })
    rows.push({
      label: no ? 'Restbeløp' : 'Remaining balance',
      value: formatMoney(Number(order.remainder_amount_nok || 0)),
      bold: true,
      highlight: Number(order.remainder_amount_nok || 0) > 0,
    })
  } else {
    rows.push({ label: no ? 'Totalt' : 'Total', value: formatMoney(Number(order.total_amount || 0)) })
    rows.push({ label: no ? 'Depositum betalt' : 'Deposit paid', value: formatMoney(Number(order.deposit_amount || 0)) })
    rows.push({
      label: no ? 'Restbeløp' : 'Remaining balance',
      value: formatMoney(Number(order.remainder_amount || 0)),
      bold: true,
      highlight: Number(order.remainder_amount || 0) > 0,
    })
  }

  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-sm">
          <span className={r.bold ? 'font-medium' : 'text-neutral-600'}>{r.label}</span>
          <span
            className={
              r.highlight ? 'font-medium text-amber-700' : r.bold ? 'font-medium' : 'text-neutral-700'
            }
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Egg panel ────────────────────────────────────────────────────────────────

function LegacyEggAdjustPanel({
  fullOrder,
  delta,
  onDelta,
  onSave,
  saving,
  formatMoney,
}: {
  fullOrder: any
  delta: number
  onDelta: (d: number) => void
  onSave: () => void
  saving: boolean
  formatMoney: (n: number) => string
}) {
  const no = useIsNorwegian()
  const breakdown = getEggOrderBreakdown(fullOrder)
  const orderLines = breakdown.lines
  const additionsTotal = getEggOrderAdditionsTotalOre(fullOrder)
  const currentQty = Number(fullOrder.quantity || 0)
  const newQty = currentQty + delta
  const newTotalEggs = newQty + breakdown.additionsQuantity
  const pricePerEgg = Number(fullOrder.price_per_egg || 0)
  const newSubtotal = newQty * pricePerEgg
  const deliveryFee = Number(fullOrder.delivery_fee || 0)
  const newTotal = newSubtotal + additionsTotal + deliveryFee
  const deposit = Number(fullOrder.deposit_amount || 0)
  const newRemainder = Math.max(0, newTotal - deposit)

  return (
    <div className="space-y-4">
      {breakdown.groupedLines.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <EggOrderSummaryBlock breakdown={breakdown} showAdjustmentHint />
          {false && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {orderLines.map((line) => (
              <span key={line.key}>
                {line.quantity} egg – {line.breedName}
              </span>
            ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-start gap-4">
        <div>
          <p className="text-xs text-neutral-500 mb-1">{no ? 'Grunnbestilling' : 'Base order'}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onDelta(delta - 1)}
              disabled={newQty <= 1}
            >
              −
            </Button>
            <span
              className={`w-12 text-center text-sm font-medium ${delta !== 0 ? (delta > 0 ? 'text-green-700' : 'text-red-700') : ''}`}
            >
              {newQty}
              {delta !== 0 && (
                <span className="block text-xs"> ({delta > 0 ? '+' : ''}{delta})</span>
              )}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onDelta(delta + 1)}
            >
              +
            </Button>
          </div>
        </div>
        <div className="text-xs text-neutral-600 space-y-0.5">
          <p>{no ? 'Ekstra egg' : 'Extra eggs'}: {breakdown.additionsQuantity}</p>
          <p>{no ? 'Ordre totalt' : 'Order total'}: {newTotalEggs} {no ? 'egg' : 'eggs'}</p>
          {delta !== 0 && (
            <>
              <p>{no ? 'Ny grunnsum' : 'New base subtotal'}: {formatMoney(newSubtotal)}</p>
              <p>{no ? 'Ny total' : 'New total'}: {formatMoney(newTotal)}</p>
              <p className={newRemainder > 0 ? 'text-amber-700 font-medium' : 'text-green-700 font-medium'}>
                {no ? 'Ny rest' : 'New remainder'}: {formatMoney(newRemainder)}
              </p>
            </>
          )}
        </div>
      </div>
      {delta !== 0 && (
        <Button onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {no ? 'Lagre endring' : 'Save change'}
        </Button>
      )}
    </div>
  )
}

// ── Chicken panel ─────────────────────────────────────────────────────────────

function EggAdjustPanel({
  fullOrder,
  adjustments,
  onQuantityChange,
  onOverrideRemainingChange,
  onSave,
  saving,
}: {
  fullOrder: any
  adjustments: Record<string, EggAdjustState>
  onQuantityChange: (inventoryId: string, nextQuantity: number) => void
  onOverrideRemainingChange: (inventoryId: string, nextValue: string) => void
  onSave: () => void
  saving: boolean
}) {
  const no = useIsNorwegian()
  const breakdown = getEggOrderBreakdown(fullOrder)
  const currentQuantities = getEggCurrentQuantitiesByInventory(fullOrder)
  const initialState = buildEggAdjustInitialState(fullOrder)
  const availability = getEggAdjustAvailability(fullOrder)
  const inventoryRows = [...getEggAdjustInventoryRows(fullOrder)].sort((a, b) => {
    const quantityDelta =
      (currentQuantities.get(String(b?.id || '')) || 0) - (currentQuantities.get(String(a?.id || '')) || 0)
    if (quantityDelta !== 0) return quantityDelta
    return relationName(a?.egg_breeds).localeCompare(relationName(b?.egg_breeds), 'nb')
  })

  const sourceLabel = (source: EggAdjustAvailabilitySource) => {
    if (source === 'actual_collected') return no ? 'Faktisk samlet' : 'Actually collected'
    if (source === 'manual_override') return no ? 'Manuelt overstyrt' : 'Manually overridden'
    return no ? 'Systeminventar' : 'System inventory'
  }

  const rows = inventoryRows.map((inventoryRow) => {
    const inventoryId = String(inventoryRow?.id || '').trim()
    const breedName = relationName(inventoryRow?.egg_breeds) || 'Rugeegg'
    const currentQuantity = currentQuantities.get(inventoryId) || 0
    const state =
      adjustments[inventoryId] ||
      initialState[inventoryId] ||
      {
        quantity: currentQuantity,
        overrideRemaining: '',
      }
    const availabilityEntry = availability[inventoryId]
    const systemFreeNow = Math.max(
      0,
      Number(
        availabilityEntry?.remaining ??
          (Number(inventoryRow?.eggs_available || 0) - Number(inventoryRow?.eggs_allocated || 0))
      )
    )
    const source: EggAdjustAvailabilitySource =
      availabilityEntry?.source || (inventoryRow?.manual_override ? 'manual_override' : 'inventory_fallback')
    const trimmedOverride = String(state.overrideRemaining || '').trim()
    const hasOverrideInput = trimmedOverride !== ''
    const parsedOverride = hasOverrideInput && /^\d+$/.test(trimmedOverride) ? Number(trimmedOverride) : null
    const invalidOverrideInput = hasOverrideInput && parsedOverride === null
    const freeNow = parsedOverride ?? systemFreeNow
    const requestedQuantity = Math.max(0, Number(state.quantity || 0))
    const projectedFree = freeNow - (requestedQuantity - currentQuantity)
    const maxWithoutOverride = currentQuantity + systemFreeNow
    const requiresOverride = requestedQuantity > maxWithoutOverride
    const hasError =
      invalidOverrideInput ||
      (requiresOverride && parsedOverride === null) ||
      (parsedOverride !== null && requestedQuantity > currentQuantity + parsedOverride)

    return {
      inventoryId,
      breedName,
      currentQuantity,
      requestedQuantity,
      systemFreeNow,
      freeNow,
      projectedFree,
      source,
      actualCollected: availabilityEntry?.actualCollected ?? null,
      collectionDaysRecorded: availabilityEntry?.collectionDaysRecorded || 0,
      hasOverrideInput,
      invalidOverrideInput,
      overrideValue: String(state.overrideRemaining || ''),
      requiresOverride,
      hasError,
      manualOverrideActive: availabilityEntry?.manualOverride || hasOverrideInput,
    }
  })

  const nextTotalEggs = rows.reduce((sum, row) => sum + row.requestedQuantity, 0)
  const totalDelta = nextTotalEggs - breakdown.totalQuantity
  const invalidRows = rows.filter((row) => row.hasError)
  const hasChanges = rows.some((row) => {
    const initialRow = initialState[row.inventoryId] || { quantity: row.currentQuantity, overrideRemaining: '' }
    return (
      row.requestedQuantity !== Math.max(0, Number(initialRow.quantity || 0)) ||
      row.overrideValue !== String(initialRow.overrideRemaining || '')
    )
  })

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <EggOrderSummaryBlock breakdown={breakdown} showAdjustmentHint />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-sm font-medium text-neutral-900">
            {no ? 'Juster bestilling per rase' : 'Adjust order by breed'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {no
              ? 'Tallene under viser fritt lager for denne uken. Override brukes bare når dere fysisk har flere egg enn systemet viser.'
              : 'The numbers below show free stock for this week. Use override only when you physically have more eggs than the system shows.'}
          </p>
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-6 text-sm text-neutral-500">
            {no ? 'Ingen lagerlinjer funnet for denne uken ennå.' : 'No inventory rows found for this week yet.'}
          </div>
        )}

        <div className="divide-y divide-neutral-200">
          {rows.map((row) => (
            <div key={row.inventoryId} className="space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">{row.breedName}</span>
                    {row.currentQuantity > 0 && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                        {no ? 'I ordre nå' : 'In order now'} {row.currentQuantity}
                      </span>
                    )}
                    {row.manualOverrideActive && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                        {no ? 'Override' : 'Override'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {sourceLabel(row.source)}
                    {row.actualCollected !== null ? ` • ${no ? 'samlet' : 'collected'} ${row.actualCollected} ${no ? 'egg' : 'eggs'}` : ''}
                    {row.collectionDaysRecorded > 0 ? ` • ${row.collectionDaysRecorded} ${no ? 'dager registrert' : 'days recorded'}` : ''}
                  </p>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-3 sm:text-right">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Fri nå' : 'Free now'}</p>
                    <p className="font-medium text-neutral-900">{row.freeNow} {no ? 'egg' : 'eggs'}</p>
                    {row.hasOverrideInput && !row.invalidOverrideInput && (
                      <p className="text-xs text-neutral-500">
                        {no ? 'Systemet viste' : 'System showed'} {row.systemFreeNow}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'I ordre etter lagring' : 'In order after save'}</p>
                    <p className="font-medium text-neutral-900">{row.requestedQuantity} {no ? 'egg' : 'eggs'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Fri etter lagring' : 'Free after save'}</p>
                    <p
                      className={
                        row.hasError
                          ? 'font-medium text-red-700'
                          : row.projectedFree <= 0
                            ? 'font-medium text-amber-700'
                            : 'font-medium text-green-700'
                      }
                    >
                      {row.hasError
                        ? (no ? 'For lav beholdning' : 'Stock too low')
                        : `${Math.max(0, row.projectedFree)} ${no ? 'egg' : 'eggs'}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{no ? 'Antall i ordre' : 'Quantity in order'}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0"
                      onClick={() => onQuantityChange(row.inventoryId, row.requestedQuantity - 1)}
                      disabled={row.requestedQuantity <= 0}
                    >
                      -
                    </Button>
                    <div className="w-16 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-center text-sm font-medium text-neutral-900">
                      {row.requestedQuantity}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0"
                      onClick={() => onQuantityChange(row.inventoryId, row.requestedQuantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {no ? 'Override fri beholdning' : 'Override free stock'}
                    </label>
                    {row.overrideValue && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto px-0 py-0 text-xs text-neutral-500 hover:text-neutral-800"
                        onClick={() => onOverrideRemainingChange(row.inventoryId, '')}
                      >
                        {no ? 'Bruk systemtall' : 'Use system value'}
                      </Button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={row.overrideValue}
                    onChange={(event) => onOverrideRemainingChange(row.inventoryId, event.target.value)}
                    placeholder={String(row.systemFreeNow)}
                    className="max-w-[180px]"
                  />
                  <p className="text-xs text-neutral-500">
                    {no
                      ? 'Skriv inn hvor mange frie egg dere faktisk har tilgjengelig nå hvis fysisk beholdning er høyere enn systemet.'
                      : 'Enter how many free eggs you actually have available now if the physical stock is higher than the system.'}
                  </p>
                  {row.invalidOverrideInput && (
                    <p className="text-xs text-red-600">
                      {no ? 'Override må være et helt tall fra 0 og oppover.' : 'Override must be a whole number from 0 and up.'}
                    </p>
                  )}
                  {!row.invalidOverrideInput && row.requiresOverride && !row.hasOverrideInput && (
                    <p className="text-xs text-red-600">
                      {no
                        ? `Systemet tillater maks ${row.currentQuantity + row.systemFreeNow} egg på denne raden uten override.`
                        : `The system allows a maximum of ${row.currentQuantity + row.systemFreeNow} eggs on this row without override.`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
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
            {totalDelta > 0 ? '+' : ''}
            {totalDelta} {no ? 'egg' : 'eggs'}
          </p>
        </div>
      </div>

      {invalidRows.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{no ? 'Noen rader kan ikke lagres ennå.' : 'Some rows cannot be saved yet.'}</p>
            <p className="text-xs text-red-600">
              {no
                ? 'Rett opp radene med for lav beholdning eller legg inn override der dere fysisk har flere egg.'
                : 'Fix the rows with too little stock or enter an override where you physically have more eggs.'}
            </p>
          </div>
        </div>
      )}

      <Button onClick={onSave} disabled={saving || !hasChanges || invalidRows.length > 0}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {no ? 'Lagre bestilling og oppdater lager' : 'Save order and update inventory'}
      </Button>
    </div>
  )
}

type ChickenDemandRow = { hatch_id: string; breed_id: string; breed_name: string; hatch_date: string; available_hens: number; available_roosters: number; demanded_hens: number; demanded_roosters: number; order_count: number }

function ChickenAdjustPanel({
  fullOrder,
  step,
  adjustDeltas,
  poolReturns,
  hatchOverrides,
  note,
  onNoteChange,
  onDeltaChange,
  onPoolChange,
  onHatchOverrideChange,
  hasChanges,
  hasSubtractions,
  onNext,
  onBack,
  onSubmit,
  saving,
  formatMoney,
  demandSummary = [],
  demandLoading = false,
  demandError = null,
  onAddBreed,
}: {
  fullOrder: any
  step: 'edit' | 'pool' | 'confirm'
  adjustDeltas: Record<string, BirdAdjustmentState>
  poolReturns: Record<string, BirdPoolReturnState>
  hatchOverrides: Record<string, ChickenHatchOverrideState>
  note: string
  onNoteChange: (v: string) => void
  onDeltaChange: (v: Record<string, BirdAdjustmentState>) => void
  onPoolChange: (v: Record<string, BirdPoolReturnState>) => void
  onHatchOverrideChange: (hatchId: string, field: keyof ChickenHatchOverrideState, nextValue: string) => void
  hasChanges: boolean
  hasSubtractions: boolean
  onNext: () => void
  onBack: () => void
  onSubmit: () => void
  saving: boolean
  formatMoney: (n: number) => string
  demandSummary?: ChickenDemandRow[]
  demandLoading?: boolean
  demandError?: string | null
  onAddBreed?: (hatchId: string, quantityHens: number, quantityRoosters: number, ageWeeksAtPickup: number) => Promise<void>
}) {
  const no = useIsNorwegian()
  const lineItems = getChickenAdjustLineItems(fullOrder)
  const lineByKey = new Map(lineItems.map((line) => [line.key, line]))
  const additions: any[] = fullOrder.chicken_order_additions || []
  const currentTotalNok = Math.max(0, Math.round(Number(fullOrder?.total_amount_nok || 0)))
  const depositPaidNok = Math.max(0, Math.round(Number(fullOrder?.deposit_amount_nok || 0)))
  const currentOutstandingRemainderNok = getChickenOutstandingRemainderNok(fullOrder)
  const completedRemainderPaidNok = Math.max(
    0,
    Math.round(Number(fullOrder?.remainder_amount_nok || 0)) - currentOutstandingRemainderNok
  )
  const deltaAmountNok = lineItems.reduce((sum, line) => {
    const delta = adjustDeltas[line.key] || { hensDelta: 0, roostersDelta: 0 }
    return sum + delta.hensDelta * line.pricePerHen + delta.roostersDelta * line.pricePerRooster
  }, 0)
  const nextTotalNok = Math.max(0, currentTotalNok + deltaAmountNok)
  const nextRemainderTargetNok = Math.max(0, nextTotalNok - Math.min(depositPaidNok, nextTotalNok))
  const nextOutstandingRemainderNok = Math.max(0, nextRemainderTargetNok - completedRemainderPaidNok)
  const hatchSummaryMap = lineItems.reduce((map, line) => {
      const summary = map.get(line.hatchId) || {
        hatchId: line.hatchId,
        breedName: line.breedName,
        systemFreeHens: line.systemFreeHens,
        systemFreeRoosters: line.systemFreeRoosters,
        addedHens: 0,
        addedRoosters: 0,
        returnedHens: 0,
        returnedRoosters: 0,
      }

      const delta = adjustDeltas[line.key] || { hensDelta: 0, roostersDelta: 0 }
      const returns = poolReturns[line.key] || { poolHensReturn: 0, poolRoostersReturn: 0 }

      summary.addedHens += Math.max(0, delta.hensDelta)
      summary.addedRoosters += Math.max(0, delta.roostersDelta)
      summary.returnedHens += Math.max(0, Math.min(Math.abs(Math.min(0, delta.hensDelta)), returns.poolHensReturn || 0))
      summary.returnedRoosters += Math.max(0, Math.min(Math.abs(Math.min(0, delta.roostersDelta)), returns.poolRoostersReturn || 0))

      map.set(line.hatchId, summary)
      return map
    }, new Map<string, {
      hatchId: string
      breedName: string
      systemFreeHens: number
      systemFreeRoosters: number
      addedHens: number
      addedRoosters: number
      returnedHens: number
      returnedRoosters: number
    }>())
  const hatchSummaries = Array.from(hatchSummaryMap.values()).map((summary) => {
    const override = hatchOverrides[summary.hatchId] || { hensFreeNow: '', roostersFreeNow: '' }
    const hensRaw = String(override.hensFreeNow || '').trim()
    const roostersRaw = String(override.roostersFreeNow || '').trim()
    const hensParsed = hensRaw !== '' && /^\d+$/.test(hensRaw) ? Number(hensRaw) : null
    const roostersParsed = roostersRaw !== '' && /^\d+$/.test(roostersRaw) ? Number(roostersRaw) : null
    const invalidHensOverride = hensRaw !== '' && hensParsed === null
    const invalidRoostersOverride = roostersRaw !== '' && roostersParsed === null
    const freeHensNow = hensParsed ?? summary.systemFreeHens
    const freeRoostersNow = roostersParsed ?? summary.systemFreeRoosters
    const projectedFreeHens = freeHensNow + summary.returnedHens - summary.addedHens
    const projectedFreeRoosters = freeRoostersNow + summary.returnedRoosters - summary.addedRoosters

    return {
      ...summary,
      overrideHensValue: hensRaw,
      overrideRoostersValue: roostersRaw,
      freeHensNow,
      freeRoostersNow,
      projectedFreeHens,
      projectedFreeRoosters,
      invalidHensOverride,
      invalidRoostersOverride,
      hasError:
        invalidHensOverride ||
        invalidRoostersOverride ||
        projectedFreeHens < 0 ||
        projectedFreeRoosters < 0,
    }
  })
  const hatchSummaryById = new Map(hatchSummaries.map((summary) => [summary.hatchId, summary]))
  const invalidHatches = hatchSummaries.filter((summary) => summary.hasError)
  const canSubmit = hasChanges && invalidHatches.length === 0
  const canAdvanceFromEdit = hasChanges
  const canAdvanceFromPool = invalidHatches.length === 0

  const getLineSubLabel = (line: ChickenAdjustLineItem) => {
    const prefix = line.kind === 'main' ? (no ? 'Hovedbestilling' : 'Main order') : (no ? 'Tillegg' : 'Addition')
    if (line.ageWeeks !== null && Number.isFinite(line.ageWeeks)) {
      return `${prefix} · ${line.ageWeeks} ${no ? 'uker' : 'weeks'}`
    }
    return prefix
  }

  // ── age-at-pickup helper ──
  const referenceDate = fullOrder.pickup_date ? new Date(fullOrder.pickup_date) : new Date()
  function ageWeeksFromHatch(hatchDateStr: string): number {
    if (!hatchDateStr) return 0
    const diff = referenceDate.getTime() - new Date(hatchDateStr).getTime()
    return Math.max(0, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)))
  }

  // ── group demand rows by breed, expand per hatch ──
  type HatchEntry = {
    hatch_id: string
    hatch_date: string
    age_weeks: number
    available: number
    demanded: number
    isThisOrder: boolean
  }
  type BreedGroup = {
    breed_id: string
    breed_name: string
    isThisOrder: boolean
    hatches: HatchEntry[]
  }
  const breedGroups: BreedGroup[] = (() => {
    const map = new Map<string, BreedGroup>()
    const orderHatchIds = new Set<string>(
      [fullOrder.hatch_id, ...(fullOrder.chicken_order_additions || []).map((a: any) => a.hatch_id)].filter(Boolean)
    )
    for (const row of demandSummary) {
      const isThisHatch = orderHatchIds.has(row.hatch_id)
      const avail = row.available_hens + row.available_roosters
      const demanded = row.demanded_hens + row.demanded_roosters
      const hatchEntry: HatchEntry = {
        hatch_id: row.hatch_id,
        hatch_date: row.hatch_date,
        age_weeks: ageWeeksFromHatch(row.hatch_date),
        available: avail,
        demanded,
        isThisOrder: isThisHatch,
      }
      const existing = map.get(row.breed_id)
      if (existing) {
        existing.hatches.push(hatchEntry)
        if (isThisHatch) existing.isThisOrder = true
      } else {
        map.set(row.breed_id, {
          breed_id: row.breed_id,
          breed_name: row.breed_name,
          isThisOrder: isThisHatch,
          hatches: [hatchEntry],
        })
      }
    }
    // filter out breeds with no data at all
    return Array.from(map.values()).filter(
      (g) => g.isThisOrder || g.hatches.some((h) => h.available > 0 || h.demanded > 0)
    )
  })()

  // ── inline add-breed state ──
  const [addingHatchId, setAddingHatchId] = useState<string | null>(null)
  const [addHatchBreedId, setAddHatchBreedId] = useState<string>('')
  const [addHens, setAddHens] = useState(0)
  const [addRoosters, setAddRoosters] = useState(0)
  const [addAge, setAddAge] = useState(0)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const openAddForm = (hatch: HatchEntry, breedId: string) => {
    setAddingHatchId(hatch.hatch_id)
    setAddHatchBreedId(breedId)
    setAddHens(0)
    setAddRoosters(0)
    setAddAge(hatch.age_weeks)
    setAddError(null)
  }
  const closeAddForm = () => { setAddingHatchId(null); setAddError(null) }

  const submitAddBreed = async () => {
    if (!onAddBreed || !addingHatchId) return
    if (addHens === 0 && addRoosters === 0) { setAddError(no ? 'Angi minst én fugl' : 'Enter at least one bird'); return }
    setAddSaving(true)
    setAddError(null)
    try {
      await onAddBreed(addingHatchId, addHens, addRoosters, addAge)
      closeAddForm()
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAddSaving(false)
    }
  }

  // ── step: edit ──
  if (step === 'edit') {
    return (
      <div className="space-y-3">
        {/* ── Inventory + demand overview ── */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {no ? 'Alle kull – lager og bestillinger' : 'All hatches – stock & orders'}
          </p>
          {demandLoading ? (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {no ? 'Laster...' : 'Loading...'}
            </div>
          ) : demandError ? (
            <p className="text-xs text-red-500">Feil: {demandError}</p>
          ) : breedGroups.length === 0 ? (
            <p className="text-xs text-neutral-400">{no ? 'Ingen aktive kull.' : 'No active hatches.'}</p>
          ) : (
            <div className="space-y-3">
              {/* column header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-xs text-neutral-400 border-b border-neutral-200 pb-1 px-1">
                <span>{no ? 'Kull / alder' : 'Hatch / age'}</span>
                <span className="text-right">{no ? 'Har' : 'Total'}</span>
                <span className="text-right">{no ? 'Bestilt' : 'Ordered'}</span>
                <span className="text-right">{no ? 'Ledig' : 'Free'}</span>
                <span />
              </div>
              {breedGroups.map((group) => (
                <div key={group.breed_id} className="space-y-0.5">
                  {/* breed header */}
                  <p className={`text-xs font-semibold px-1 pb-0.5 ${group.isThisOrder ? 'text-neutral-900' : 'text-neutral-500'}`}>
                    {group.breed_name}{group.isThisOrder ? ' ★' : ''}
                  </p>
                  {/* per-hatch rows */}
                  {group.hatches.map((hatch) => {
                    const isAdding = addingHatchId === hatch.hatch_id
                    const hatchLabel = hatch.hatch_date
                      ? new Date(hatch.hatch_date).toLocaleDateString(no ? 'nb-NO' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : hatch.hatch_id
                    const sexed = isBirdSexed(hatch.age_weeks, group.breed_id)
                    return (
                      <div key={hatch.hatch_id} className={`rounded-md ${hatch.isThisOrder ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-neutral-100'}`}>
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 items-center text-xs py-1.5 px-2">
                          <span className="text-neutral-600">
                            <span className="font-medium">{hatchLabel}</span>
                            <span className="ml-1.5 text-neutral-400">
                              {hatch.age_weeks} {no ? 'uker' : 'wks'}
                              {!sexed && <span className="ml-1 text-neutral-300">· {no ? 'ukjent kjønn' : 'unsexed'}</span>}
                            </span>
                          </span>
                          <span className="text-right tabular-nums text-neutral-700">
                            {hatch.available + hatch.demanded}
                          </span>
                          <span className="text-right tabular-nums text-neutral-500">
                            {hatch.demanded > 0 ? hatch.demanded : <span className="text-neutral-300">—</span>}
                          </span>
                          <span className={`text-right tabular-nums font-medium ${hatch.available === 0 ? 'text-neutral-300' : hatch.available < hatch.demanded ? 'text-red-600' : 'text-green-700'}`}>
                            {hatch.available}
                          </span>
                          <span className="text-right">
                            {onAddBreed && !isAdding && (
                              <button onClick={() => openAddForm(hatch, group.breed_id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
                                + {no ? 'Legg til' : 'Add'}
                              </button>
                            )}
                            {isAdding && <button onClick={closeAddForm} className="text-xs text-neutral-400 hover:text-neutral-600">✕</button>}
                          </span>
                        </div>
                        {isAdding && (
                          <div className="mx-2 mb-2 rounded-md border border-blue-200 bg-blue-50 p-3 space-y-3">
                            <p className="text-xs text-neutral-500">
                              {hatchLabel} · {hatch.age_weeks} {no ? 'uker' : 'wks'}
                              {!sexed && ` · ${no ? 'ukjent kjønn – teller som kyllinger' : 'unsexed – counts as chicks'}`}
                            </p>
                            <div className={`grid gap-2 ${sexed ? 'grid-cols-3' : 'grid-cols-2'}`}>
                              {sexed ? (
                                <>
                                  <div>
                                    <label className="text-xs text-neutral-500 block mb-1">{no ? 'Høner' : 'Hens'}</label>
                                    <Input type="number" min="0" step="1" value={addHens} onChange={(e) => setAddHens(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-neutral-500 block mb-1">{no ? 'Haner' : 'Roosters'}</label>
                                    <Input type="number" min="0" step="1" value={addRoosters} onChange={(e) => setAddRoosters(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm" />
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <label className="text-xs text-neutral-500 block mb-1">{no ? 'Kyllinger' : 'Chicks'}</label>
                                  <Input type="number" min="0" step="1" value={addHens} onChange={(e) => setAddHens(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm" />
                                </div>
                              )}
                              <div>
                                <label className="text-xs text-neutral-500 block mb-1">{no ? 'Alder (uker)' : 'Age (weeks)'}</label>
                                <Input type="number" min="0" step="1" value={addAge} onChange={(e) => setAddAge(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm" />
                              </div>
                            </div>
                            {addError && <p className="text-xs text-red-600">{addError}</p>}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={submitAddBreed} disabled={addSaving} className="h-7 text-xs">
                                {addSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                {no ? 'Legg til' : 'Add to order'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={closeAddForm} disabled={addSaving} className="h-7 text-xs">
                                {no ? 'Avbryt' : 'Cancel'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-neutral-500">
          {no
            ? 'Bruk +/- for å justere antall på hver bestillingslinje.'
            : 'Use +/- to adjust the quantity on each order line.'}
        </p>
        {/* Main order line */}
        <BirdAdjustLine
          label={fullOrder.chicken_breeds?.name || '—'}
          subLabel={`${no ? 'Hovedbestilling' : 'Main order'} · ${fullOrder.age_weeks_at_pickup} ${no ? 'uker' : 'weeks'}`}
          currentHens={Number(fullOrder.quantity_hens || 0)}
          currentRoosters={Number(fullOrder.quantity_roosters || 0)}
          hensDelta={adjustDeltas['main']?.hensDelta || 0}
          roostersDelta={adjustDeltas['main']?.roostersDelta || 0}
          onHensDelta={(d) =>
            onDeltaChange({ ...adjustDeltas, main: { ...adjustDeltas['main'], hensDelta: d } })
          }
          onRoostersDelta={(d) =>
            onDeltaChange({ ...adjustDeltas, main: { ...adjustDeltas['main'], roostersDelta: d } })
          }
          ageWeeks={fullOrder.age_weeks_at_pickup}
          breedSlug={fullOrder.chicken_breeds?.slug ?? null}
        />
        {additions.map((addition: any) => (
          <BirdAdjustLine
            key={addition.id}
            label={addition.chicken_breeds?.name || '—'}
            subLabel={no ? 'Tillegg' : 'Addition'}
            currentHens={Number(addition.quantity_hens || 0)}
            currentRoosters={Number(addition.quantity_roosters || 0)}
            hensDelta={adjustDeltas[addition.id]?.hensDelta || 0}
            roostersDelta={adjustDeltas[addition.id]?.roostersDelta || 0}
            onHensDelta={(d) =>
              onDeltaChange({ ...adjustDeltas, [addition.id]: { ...adjustDeltas[addition.id], hensDelta: d } })
            }
            onRoostersDelta={(d) =>
              onDeltaChange({ ...adjustDeltas, [addition.id]: { ...adjustDeltas[addition.id], roostersDelta: d } })
            }
            ageWeeks={fullOrder.age_weeks_at_pickup}
            breedSlug={addition.chicken_breeds?.slug ?? null}
          />
        ))}
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs text-neutral-500">
            {no
              ? 'Systemet bruker bare fritt lager som ikke allerede er reservert. Legg inn override kun hvis dere fysisk har flere frie fugler enn systemet viser.'
              : 'The system only uses free stock that is not already reserved. Enter an override only if you physically have more free birds than the system shows.'}
          </p>
          {hatchSummaries.map((summary) => (
            <div key={summary.hatchId} className="rounded-lg border border-neutral-200 bg-white p-3 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{summary.breedName}</p>
                  <p className="text-xs text-neutral-500">
                    {no ? 'Fritt lager for kullet som brukes i denne bestillingen.' : 'Free stock for the hatch used by this order.'}
                  </p>
                </div>
                {summary.hasError && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    {no ? 'For lav beholdning' : 'Stock too low'}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Fri høner nå' : 'Free hens now'}</p>
                  <p className="mt-1 font-medium text-neutral-900">{summary.freeHensNow}</p>
                  <p className={`text-xs ${summary.projectedFreeHens < 0 ? 'text-red-600' : 'text-neutral-500'}`}>
                    {no ? 'Fri etter lagring' : 'Free after save'}: {Math.max(0, summary.projectedFreeHens)}
                  </p>
                </div>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">{no ? 'Fri haner nå' : 'Free roosters now'}</p>
                  <p className="mt-1 font-medium text-neutral-900">{summary.freeRoostersNow}</p>
                  <p className={`text-xs ${summary.projectedFreeRoosters < 0 ? 'text-red-600' : 'text-neutral-500'}`}>
                    {no ? 'Fri etter lagring' : 'Free after save'}: {Math.max(0, summary.projectedFreeRoosters)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {no ? 'Override fri høner' : 'Override free hens'}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={summary.overrideHensValue}
                    onChange={(event) => onHatchOverrideChange(summary.hatchId, 'hensFreeNow', event.target.value)}
                    placeholder={String(summary.systemFreeHens)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {no ? 'Override fri haner' : 'Override free roosters'}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={summary.overrideRoostersValue}
                    onChange={(event) => onHatchOverrideChange(summary.hatchId, 'roostersFreeNow', event.target.value)}
                    placeholder={String(summary.systemFreeRoosters)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {invalidHatches.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{no ? 'Noen kull har for lav fri beholdning.' : 'Some hatches do not have enough free stock.'}</p>
              <p className="text-xs text-red-600">
                {no
                  ? 'Reduser antallene, legg flere fugler tilbake til lageret, eller legg inn override der dere faktisk har flere fugler fysisk.'
                  : 'Reduce the quantities, return more birds to inventory, or add an override where you physically have more birds on hand.'}
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button onClick={onNext} disabled={!canAdvanceFromEdit} size="sm">
            {no ? 'Neste' : 'Next'}
          </Button>
        </div>
      </div>
    )
  }

  // ── step: pool ──
  if (step === 'pool') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-neutral-500">
          {no
            ? 'Hvor mange av de fjernede fuglene skal tilbake til lageret? Fugler som ikke legges tilbake regnes som korreksjoner.'
            : 'How many of the removed birds should go back into inventory? Birds not returned are treated as corrections.'}
        </p>
        {Object.entries(adjustDeltas)
          .filter(([, d]) => d.hensDelta < 0 || d.roostersDelta < 0)
          .map(([key, delta]) => {
            const isMain = key === 'main'
            const addition = !isMain ? additions.find((a: any) => a.id === key) : null
            const breedName = isMain
              ? fullOrder.chicken_breeds?.name || '—'
              : addition?.chicken_breeds?.name || '—'
            const pr = poolReturns[key] || { poolHensReturn: 0, poolRoostersReturn: 0 }

            return (
              <div key={key} className="rounded border border-neutral-200 p-3 space-y-2">
                <p className="text-sm font-medium">
                  {breedName} {isMain ? (no ? '(Hoved)' : '(Main)') : (no ? '(Tillegg)' : '(Addition)')}
                </p>
                {delta.hensDelta < 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>{Math.abs(delta.hensDelta)} {no ? 'høner fjernet' : 'hens removed'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">{no ? 'Tilbake til lager:' : 'Back to inventory:'}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          onPoolChange({
                            ...poolReturns,
                            [key]: { ...pr, poolHensReturn: Math.max(0, pr.poolHensReturn - 1) },
                          })
                        }
                        disabled={pr.poolHensReturn <= 0}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center font-medium">{pr.poolHensReturn}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          onPoolChange({
                            ...poolReturns,
                            [key]: {
                              ...pr,
                              poolHensReturn: Math.min(Math.abs(delta.hensDelta), pr.poolHensReturn + 1),
                            },
                          })
                        }
                        disabled={pr.poolHensReturn >= Math.abs(delta.hensDelta)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}
                {delta.roostersDelta < 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>{Math.abs(delta.roostersDelta)} {no ? 'haner fjernet' : 'roosters removed'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">{no ? 'Tilbake til lager:' : 'Back to inventory:'}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          onPoolChange({
                            ...poolReturns,
                            [key]: {
                              ...pr,
                              poolRoostersReturn: Math.max(0, pr.poolRoostersReturn - 1),
                            },
                          })
                        }
                        disabled={pr.poolRoostersReturn <= 0}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center font-medium">{pr.poolRoostersReturn}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          onPoolChange({
                            ...poolReturns,
                            [key]: {
                              ...pr,
                              poolRoostersReturn: Math.min(
                                Math.abs(delta.roostersDelta),
                                pr.poolRoostersReturn + 1
                              ),
                            },
                          })
                        }
                        disabled={pr.poolRoostersReturn >= Math.abs(delta.roostersDelta)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} size="sm">
            {no ? 'Tilbake' : 'Back'}
          </Button>
          <Button onClick={onNext} disabled={!canAdvanceFromPool} size="sm">
            {no ? 'Neste' : 'Next'}
          </Button>
        </div>
      </div>
    )
  }

  // ── step: confirm ──
  return (
    <div className="space-y-3">
      <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm space-y-1">
        {Object.entries(adjustDeltas)
          .filter(([, d]) => d.hensDelta !== 0 || d.roostersDelta !== 0)
          .map(([key, delta]) => {
            const isMain = key === 'main'
            const addition = !isMain ? additions.find((a: any) => a.id === key) : null
            const breedName = isMain
              ? fullOrder.chicken_breeds?.name || '—'
              : addition?.chicken_breeds?.name || '—'
            const pr = poolReturns[key] || { poolHensReturn: 0, poolRoostersReturn: 0 }
            return (
              <div key={key}>
                <p className="font-medium">
                  {breedName} {isMain ? (no ? '(Hoved)' : '(Main)') : (no ? '(Tillegg)' : '(Addition)')}:
                </p>
                {delta.hensDelta !== 0 && (
                  <p className="ml-3 text-xs">
                    {no ? 'Høner' : 'Hens'}: {delta.hensDelta > 0 ? '+' : ''}{delta.hensDelta}
                    {delta.hensDelta < 0 && pr.poolHensReturn > 0 && (
                      <span className="text-green-700 ml-1">
                        ({pr.poolHensReturn} {no ? 'tilbake til lager' : 'back to inventory'})
                      </span>
                    )}
                    {delta.hensDelta > 0 && (
                      <span className="text-blue-700 ml-1">
                        {no ? '(øker lager)' : '(increases inventory)'}
                      </span>
                    )}
                  </p>
                )}
                {delta.roostersDelta !== 0 && (
                  <p className="ml-3 text-xs">
                    {no ? 'Haner' : 'Roosters'}: {delta.roostersDelta > 0 ? '+' : ''}{delta.roostersDelta}
                    {delta.roostersDelta < 0 && pr.poolRoostersReturn > 0 && (
                      <span className="text-green-700 ml-1">
                        ({pr.poolRoostersReturn} {no ? 'tilbake til lager' : 'back to inventory'})
                      </span>
                    )}
                  </p>
                )}
              </div>
            )
          })}
      </div>
      <div className="rounded border border-neutral-200 bg-white p-3 text-sm space-y-1">
        <div className="flex justify-between gap-3">
          <span className="text-neutral-600">{no ? 'Total nå' : 'Current total'}</span>
          <span className="font-medium">{formatMoney(currentTotalNok)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-600">{no ? 'Ny total' : 'New total'}</span>
          <span className="font-medium">{formatMoney(nextTotalNok)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-600">{no ? 'Depositum betalt' : 'Deposit paid'}</span>
          <span>{formatMoney(depositPaidNok)}</span>
        </div>
        {completedRemainderPaidNok > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-neutral-600">{no ? 'Rest allerede betalt' : 'Remainder already paid'}</span>
            <span>{formatMoney(completedRemainderPaidNok)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-neutral-100 pt-2">
          <span className="font-medium text-neutral-800">
            {no ? 'Ny rest til betaling' : 'New remainder due'}
          </span>
          <span className={nextOutstandingRemainderNok > 0 ? 'font-medium text-amber-700' : 'font-medium text-green-700'}>
            {formatMoney(nextOutstandingRemainderNok)}
          </span>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-600">{no ? 'Notat (valgfritt)' : 'Note (optional)'}</label>
        <Input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={no ? 'Årsak til justering...' : 'Reason for adjustment...'}
          className="mt-1"
        />
      </div>
      <div className="flex justify-between pt-1">
        <Button variant="outline" onClick={onBack} size="sm">
          {no ? 'Tilbake' : 'Back'}
        </Button>
        <Button onClick={onSubmit} disabled={saving || !canSubmit} size="sm">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {no ? 'Bekreft endring' : 'Confirm change'}
        </Button>
      </div>
    </div>
  )
}

// ── Pig panel ─────────────────────────────────────────────────────────────────

function PigAdjustPanel({
  fullOrder,
  boxConfigs,
  extrasOptions,
  mangalitsaPresets,
  boxSize,
  mangalitsaPresetId,
  extraIds,
  note,
  onBoxSize,
  onMangalitsaPreset,
  onExtraIds,
  onNote,
  onSave,
  saving,
  formatMoney,
}: {
  fullOrder: any
  boxConfigs: { box_size: number; price: number }[]
  extrasOptions: { id: string; name_no: string; price_nok: number }[]
  mangalitsaPresets: { id: string; name_no: string; price_nok: number }[]
  boxSize: number | null
  mangalitsaPresetId: string | null
  extraIds: string[]
  note: string
  onBoxSize: (v: number) => void
  onMangalitsaPreset: (v: string) => void
  onExtraIds: (v: string[]) => void
  onNote: (v: string) => void
  onSave: () => void
  saving: boolean
  formatMoney: (n: number) => string
}) {
  const no = useIsNorwegian()

  const toggleExtra = (id: string) => {
    if (extraIds.includes(id)) {
      onExtraIds(extraIds.filter((e) => e !== id))
    } else {
      onExtraIds([...extraIds, id])
    }
  }

  return (
    <div className="space-y-5">
      {/* Standard box */}
      {boxConfigs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wide">
            {no ? 'Standard boks' : 'Standard box'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {boxConfigs.map((bc) => (
              <button
                key={bc.box_size}
                onClick={() => onBoxSize(bc.box_size)}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  !mangalitsaPresetId && boxSize === bc.box_size
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {bc.box_size}kg — {formatMoney(Number(bc.price))}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mangalitsa preset */}
      {mangalitsaPresets.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wide">
            {no ? 'Mangalitsa-pakke' : 'Mangalitsa pack'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {mangalitsaPresets.map((mp) => (
              <button
                key={mp.id}
                onClick={() => onMangalitsaPreset(mp.id)}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  mangalitsaPresetId === mp.id
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {mp.name_no} — {formatMoney(Number(mp.price_nok))}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Extras */}
      {extrasOptions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wide">
            {no ? 'Tilbehør' : 'Extras'}
          </p>
          <div className="space-y-1.5">
            {extrasOptions.map((extra) => (
              <label
                key={extra.id}
                className="flex items-center gap-3 text-sm cursor-pointer hover:bg-neutral-50 rounded-lg px-2 py-1.5 transition-colors"
              >
                <input
                  type="checkbox"
                  className="rounded"
                  checked={extraIds.includes(extra.id)}
                  onChange={() => toggleExtra(extra.id)}
                />
                <span className="flex-1">{extra.name_no}</span>
                <span className="text-neutral-500 text-xs">{formatMoney(Number(extra.price_nok))}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div>
        <label className="text-xs text-neutral-500 mb-1 block">
          {no ? 'Notat (valgfritt)' : 'Note (optional)'}
        </label>
        <Input
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder={no ? 'Årsak til endring...' : 'Reason for change...'}
        />
      </div>

      {/* Preview */}
      {(() => {
        const selectedBoxPrice = mangalitsaPresetId
          ? mangalitsaPresets.find((mp) => mp.id === mangalitsaPresetId)?.price_nok || 0
          : boxConfigs.find((bc) => bc.box_size === boxSize)?.price || 0
        const extrasTotal = extraIds.reduce((sum, id) => {
          const ex = extrasOptions.find((e) => e.id === id)
          return sum + Number(ex?.price_nok || 0)
        }, 0)
        const newTotal = Number(selectedBoxPrice) + extrasTotal
        const deposit = Number(fullOrder.deposit_amount || 0)
        const newRemainder = Math.max(0, newTotal - deposit)

        return (
          <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">{no ? 'Boks/pakke' : 'Box/pack'}</span>
              <span>{formatMoney(Number(selectedBoxPrice))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">
                {no ? 'Tilbehør' : 'Extras'} ({extraIds.length})
              </span>
              <span>{formatMoney(extrasTotal)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-neutral-200 pt-1 mt-1">
              <span>{no ? 'Ny total' : 'New total'}</span>
              <span>{formatMoney(newTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{no ? 'Depositum betalt' : 'Deposit paid'}</span>
              <span>{formatMoney(deposit)}</span>
            </div>
            <div
              className={`flex justify-between font-medium ${newRemainder > 0 ? 'text-amber-700' : 'text-green-700'}`}
            >
              <span>{no ? 'Ny rest' : 'New remainder'}</span>
              <span>{formatMoney(newRemainder)}</span>
            </div>
          </div>
        )
      })()}

      <Button onClick={onSave} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {no ? 'Lagre endringer' : 'Save changes'}
      </Button>
    </div>
  )
}
