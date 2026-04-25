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
}

type EggPaymentLike = {
  payment_type?: string | null
  status?: string | null
  amount_nok?: number | null
}

function relationName(relation: any): string {
  if (Array.isArray(relation)) {
    return String(relation[0]?.name || '').trim()
  }
  return String(relation?.name || '').trim()
}

function getEggOrderLines(order: any): Array<{ key: string; quantity: number; breedName: string }> {
  const lines: Array<{ key: string; quantity: number; breedName: string }> = []
  const baseBreedName = relationName(order?.egg_breeds) || 'Rugeegg'

  if (Number(order?.quantity || 0) > 0) {
    lines.push({
      key: `base:${baseBreedName}`,
      quantity: Number(order.quantity || 0),
      breedName: baseBreedName,
    })
  }

  for (const addition of order?.egg_order_additions || []) {
    const breedName = relationName(addition?.egg_breeds) || relationName(addition?.egg_inventory?.egg_breeds) || 'Tillegg'
    lines.push({
      key: String(addition?.id || `${breedName}:${addition?.quantity || 0}`),
      quantity: Number(addition?.quantity || 0),
      breedName,
    })
  }

  return lines
}

function getEggOrderAdditionsTotalOre(order: any): number {
  return (order?.egg_order_additions || []).reduce(
    (sum: number, addition: any) => sum + Number(addition?.subtotal || 0),
    0
  )
}

function getEggOutstandingRemainderOre(order: any): number {
  const remainderTargetOre = Number(order?.remainder_amount || 0)
  const remainderPaidOre = (order?.egg_payments || []).reduce((sum: number, payment: EggPaymentLike) => {
    if (payment?.payment_type !== 'remainder' || payment?.status !== 'completed') return sum
    return sum + Math.round(Number(payment?.amount_nok || 0) * 100)
  }, 0)

  return Math.max(0, remainderTargetOre - remainderPaidOre)
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

function toCustomerProfileHref(order: any, type?: OrderType): string | null {
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

  if (!customerId) return null

  const params = new URLSearchParams({
    tab: 'customers',
    subTab: 'database',
    customerId,
  })

  return `/admin?${params.toString()}`
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
}: AdjustBirdLine) {
  return (
    <div className="rounded border border-neutral-200 p-3 space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-neutral-500">{subLabel}</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-12">Høner</span>
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
          <span className="text-xs text-neutral-500 w-12">Haner</span>
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
}

export function PickupFulfillmentModal({ order, onClose, onRefresh }: Props) {
  const { toast } = useToast()
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

  // ── chicken bird adjustment state ──────────────────────────────────────────
  const [birdStep, setBirdStep] = useState<'edit' | 'pool' | 'confirm'>('edit')
  const [adjustDeltas, setAdjustDeltas] = useState<Record<string, { hensDelta: number; roostersDelta: number }>>({})
  const [poolReturns, setPoolReturns] = useState<Record<string, { poolHensReturn: number; poolRoostersReturn: number }>>({})
  const [birdNote, setBirdNote] = useState('')
  const [birdSaving, setBirdSaving] = useState(false)

  // ── egg quantity adjustment state ──────────────────────────────────────────
  const [eggQtyDelta, setEggQtyDelta] = useState(0)
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
        const initial: Record<string, { hensDelta: number; roostersDelta: number }> = {}
        initial['main'] = { hensDelta: 0, roostersDelta: 0 }
        for (const addition of (data.chicken_order_additions || [])) {
          initial[addition.id] = { hensDelta: 0, roostersDelta: 0 }
        }
        setAdjustDeltas(initial)
        setPoolReturns({})
        setBirdStep('edit')
        setBirdNote('')
      }

      // Init egg delta
      if (order.type === 'egg') {
        setEggQtyDelta(0)
      }
    } catch (err: any) {
      toast({ title: 'Feil', description: err.message || 'Kunne ikke hente bestilling', variant: 'destructive' })
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
        throw new Error(err.error || 'Feil ved lagring')
      }
      toast({ title: 'Lagret', description: 'Hentedag oppdatert.' })
      await fetchOrder()
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Feil', description: err.message, variant: 'destructive' })
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
        throw new Error(err.error || 'Feil ved sending')
      }
      toast({ title: 'E-post sendt', description: 'Påminnelse om hentedag er sendt.' })
    } catch (err: any) {
      toast({ title: 'Feil', description: err.message, variant: 'destructive' })
    } finally {
      setReminderSending(false)
    }
  }

  // ─── chicken bird adjustment helpers ──────────────────────────────────────

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
            poolHensIncrease: d.hensDelta > 0 ? d.hensDelta : 0,
            poolRoostersIncrease: d.roostersDelta > 0 ? d.roostersDelta : 0,
          }
        })

      const res = await fetch(`/api/admin/chickens/orders/${fullOrder.id}/adjust-birds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments, adminNote: birdNote }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || 'Feil ved justering')

      toast({ title: 'Bestilling oppdatert', description: 'Antall fugler justert.' })
      setBirdStep('edit')
      setBirdNote('')
      await fetchOrder()
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Feil', description: err.message, variant: 'destructive' })
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
      if (newQty <= 0) throw new Error('Antall kan ikke være 0 eller negativt')
      const res = await fetch(`/api/admin/eggs/orders/${fullOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || 'Feil ved oppdatering')
      toast({ title: 'Oppdatert', description: `Antall egg endret til ${newQty}.` })
      setEggQtyDelta(0)
      await fetchOrder()
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Feil', description: err.message, variant: 'destructive' })
    } finally {
      setEggSaving(false)
    }
  }

  // ─── pig adjustment helper ─────────────────────────────────────────────────

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
      if (!res.ok) throw new Error(result?.error || 'Feil ved oppdatering')
      toast({ title: 'Oppdatert', description: 'Boks og tilbehør lagret.' })
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
    const customerEmail =
      fullOrder.customer_email
    const orderNumber = fullOrder.order_number || order.order_number
    const productType =
      order.type === 'egg' ? 'eggs' : order.type === 'chicken' ? 'chickens' : 'pigs'

    setPaymentSending(true)
    try {
      const res = await fetch('/api/admin/deferred-payments/request-payment', {
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
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || 'Feil ved sending')
      toast({ title: 'Betalingslenke sendt', description: `E-post sendt til ${customerEmail}.` })
    } catch (err: any) {
      toast({ title: 'Feil', description: err.message, variant: 'destructive' })
    } finally {
      setPaymentSending(false)
    }
  }

  // ─── derived values ────────────────────────────────────────────────────────

  const pickupDayIsSet = !!(fullOrder?.pickup_date)

  const remainder = (() => {
    if (!fullOrder) return 0
    if (order?.type === 'egg') return getEggOutstandingRemainderOre(fullOrder)
    if (order?.type === 'chicken') return Number(fullOrder.remainder_amount_nok || 0)
    if (order?.type === 'pig') return Number(fullOrder.remainder_amount || 0)
    return 0
  })()

  const formatMoney = (n: number) => {
    const normalized = order?.type === 'egg' ? Number(n || 0) / 100 : Number(n || 0)
    return `kr ${Math.round(normalized).toLocaleString('nb-NO')}`
  }

  const displayStatus = fullOrder ? getDisplayStatus(fullOrder, order?.type) : (order?.status || '—')
  const customerProfileHref = fullOrder ? toCustomerProfileHref(fullOrder, order?.type) : null
  const paymentSummaryOrder =
    fullOrder && order?.type === 'egg'
      ? { ...fullOrder, remainder_amount: remainder }
      : fullOrder

  const formatPickupDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('nb-NO', {
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
    order?.type === 'egg' ? 'Rugeegg' : order?.type === 'chicken' ? 'Kylling' : 'Gris'

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
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-neutral-400 shrink-0" />
                {customerProfileHref ? (
                  <a href={customerProfileHref} className="font-medium text-neutral-900 hover:underline">
                    {fullOrder.customer_name}
                  </a>
                ) : (
                  <span className="font-medium">{fullOrder.customer_name}</span>
                )}
                {fullOrder.customer_email && (
                  <span className="text-neutral-500 text-xs">{fullOrder.customer_email}</span>
                )}
              </div>
              {fullOrder.customer_phone && (
                <p className="text-xs text-neutral-500 pl-6">{fullOrder.customer_phone}</p>
              )}
              {/* Order summary line */}
              <div className="flex items-start gap-2 text-sm pl-6">
                <Package className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <OrderSummaryLine order={fullOrder} type={order!.type} />
              </div>
              <div className="flex items-center gap-2 pl-6">
                <StatusBadge status={displayStatus} />
                {remainder > 0 && (
                  <span className="text-xs text-amber-700 font-medium">
                    Restbetaling: {formatMoney(remainder)}
                  </span>
                )}
              </div>
            </div>

            {/* ── Section: Hentedag ── */}
            <SectionToggle
              title="Hentedag"
              open={sectionPickup}
              onToggle={() => setSectionPickup((v) => !v)}
            >
              <div className="space-y-4">
                {pickupDayIsSet ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="font-medium text-green-700">
                      {formatPickupDate(fullOrder.pickup_date!)} kl. {fullOrder.pickup_time || '—'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Hentedag ikke valgt av kunde</span>
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
                      Send påminnelse
                    </Button>
                  </div>
                )}

                {/* Pickup day editor */}
                <div className="border-t border-neutral-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    {pickupDayIsSet ? 'Endre hentedag' : 'Velg hentedag'}
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500 mb-1 block">Dato</label>
                      <Input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Tid</label>
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
                      Lagre
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
                      Send påminnelse på e-post
                    </Button>
                  )}
                </div>
              </div>
            </SectionToggle>

            {/* ── Section: Juster bestilling ── */}
            <SectionToggle
              title="Juster bestilling"
              open={sectionAdjust}
              onToggle={() => setSectionAdjust((v) => !v)}
            >
              {order?.type === 'egg' && (
                <EggAdjustPanel
                  fullOrder={fullOrder}
                  delta={eggQtyDelta}
                  onDelta={setEggQtyDelta}
                  onSave={submitEggQty}
                  saving={eggSaving}
                  formatMoney={formatMoney}
                />
              )}

              {order?.type === 'chicken' && (
                <ChickenAdjustPanel
                  fullOrder={fullOrder}
                  step={birdStep}
                  adjustDeltas={adjustDeltas}
                  poolReturns={poolReturns}
                  note={birdNote}
                  onNoteChange={setBirdNote}
                  onDeltaChange={setAdjustDeltas}
                  onPoolChange={setPoolReturns}
                  hasChanges={birdHasChanges()}
                  hasSubtractions={birdHasSubtractions()}
                  onNext={handleBirdNext}
                  onBack={handleBirdBack}
                  onSubmit={submitBirds}
                  saving={birdSaving}
                  formatMoney={formatMoney}
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
              title={`Betaling${remainder > 0 ? ` – ${formatMoney(remainder)} gjenstår` : ''}`}
              open={sectionPayment}
              onToggle={() => setSectionPayment((v) => !v)}
            >
              <div className="space-y-4">
                <PaymentSummary
                  order={paymentSummaryOrder}
                  type={order!.type}
                  formatMoney={formatMoney}
                />
                {remainder > 0 && (
                  <div className="border-t border-neutral-100 pt-4">
                    <p className="text-sm text-neutral-600 mb-3">
                      Send kunden en e-post med lenke til å betale restbeløpet via Vipps.
                    </p>
                    <Button onClick={sendPaymentRequest} disabled={paymentSending}>
                      {paymentSending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Send Vipps-betalingslenke
                    </Button>
                  </div>
                )}
                {remainder <= 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Fullt betalt
                  </div>
                )}
              </div>
            </SectionToggle>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── sub-panels ───────────────────────────────────────────────────────────────

function OrderSummaryLine({ order, type }: { order: any; type: OrderType }) {
  if (type === 'egg') {
    const lines = getEggOrderLines(order)
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)
    return (
      <div className="space-y-0.5 text-xs text-neutral-600">
        <p>{totalQuantity} egg totalt</p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {lines.map((line) => (
            <span key={line.key}>
              {line.quantity} egg – {line.breedName}
            </span>
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
        {hens} høner + {roosters} haner{breed ? ` – ${breed}` : ''}
        {additions > 0 ? ` (+${additions} tillegg)` : ''}
      </span>
    )
  }
  if (type === 'pig') {
    if (order.is_mangalitsa) {
      return <span className="text-xs text-neutral-600">Mangalitsa</span>
    }
    return <span className="text-xs text-neutral-600">{order.box_size ?? '?'}kg boks</span>
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
  const rows: { label: string; value: string; bold?: boolean; highlight?: boolean }[] = []

  if (type === 'egg') {
    rows.push({ label: 'Totalt', value: formatMoney(Number(order.total_amount || 0)) })
    rows.push({ label: 'Depositum betalt', value: formatMoney(Number(order.deposit_amount || 0)) })
    rows.push({
      label: 'Restbeløp',
      value: formatMoney(Number(order.remainder_amount || 0)),
      bold: true,
      highlight: Number(order.remainder_amount || 0) > 0,
    })
  } else if (type === 'chicken') {
    rows.push({ label: 'Totalt', value: formatMoney(Number(order.total_amount_nok || 0)) })
    rows.push({ label: 'Depositum betalt', value: formatMoney(Number(order.deposit_amount_nok || 0)) })
    rows.push({
      label: 'Restbeløp',
      value: formatMoney(Number(order.remainder_amount_nok || 0)),
      bold: true,
      highlight: Number(order.remainder_amount_nok || 0) > 0,
    })
  } else {
    rows.push({ label: 'Totalt', value: formatMoney(Number(order.total_amount || 0)) })
    rows.push({ label: 'Depositum betalt', value: formatMoney(Number(order.deposit_amount || 0)) })
    rows.push({
      label: 'Restbeløp',
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

function EggAdjustPanel({
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
  const orderLines = getEggOrderLines(fullOrder)
  const additionsTotal = getEggOrderAdditionsTotalOre(fullOrder)
  const totalOrderEggs = orderLines.reduce((sum, line) => sum + line.quantity, 0)
  const currentQty = Number(fullOrder.quantity || 0)
  const newQty = currentQty + delta
  const pricePerEgg = Number(fullOrder.price_per_egg || 0)
  const newSubtotal = newQty * pricePerEgg
  const deliveryFee = Number(fullOrder.delivery_fee || 0)
  const newTotal = newSubtotal + additionsTotal + deliveryFee
  const deposit = Number(fullOrder.deposit_amount || 0)
  const newRemainder = Math.max(0, newTotal - deposit)

  return (
    <div className="space-y-4">
      {orderLines.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 space-y-1">
          <p className="font-medium text-neutral-700">{totalOrderEggs} egg i ordren totalt</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {orderLines.map((line) => (
              <span key={line.key}>
                {line.quantity} egg – {line.breedName}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-neutral-500 mb-1">Antall egg</p>
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
        {delta !== 0 && (
          <div className="text-xs text-neutral-600 space-y-0.5">
            <p>Ny subtotal: {formatMoney(newSubtotal)}</p>
            <p>Ny total: {formatMoney(newTotal)}</p>
            <p className={newRemainder > 0 ? 'text-amber-700 font-medium' : 'text-green-700 font-medium'}>
              Ny rest: {formatMoney(newRemainder)}
            </p>
          </div>
        )}
      </div>
      {delta !== 0 && (
        <Button onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Lagre endring
        </Button>
      )}
    </div>
  )
}

// ── Chicken panel ─────────────────────────────────────────────────────────────

function ChickenAdjustPanel({
  fullOrder,
  step,
  adjustDeltas,
  poolReturns,
  note,
  onNoteChange,
  onDeltaChange,
  onPoolChange,
  hasChanges,
  hasSubtractions,
  onNext,
  onBack,
  onSubmit,
  saving,
  formatMoney,
}: {
  fullOrder: any
  step: 'edit' | 'pool' | 'confirm'
  adjustDeltas: Record<string, { hensDelta: number; roostersDelta: number }>
  poolReturns: Record<string, { poolHensReturn: number; poolRoostersReturn: number }>
  note: string
  onNoteChange: (v: string) => void
  onDeltaChange: (v: Record<string, { hensDelta: number; roostersDelta: number }>) => void
  onPoolChange: (v: Record<string, { poolHensReturn: number; poolRoostersReturn: number }>) => void
  hasChanges: boolean
  hasSubtractions: boolean
  onNext: () => void
  onBack: () => void
  onSubmit: () => void
  saving: boolean
  formatMoney: (n: number) => string
}) {
  const additions: any[] = fullOrder.chicken_order_additions || []

  // ── step: edit ──
  if (step === 'edit') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-neutral-500">
          Bruk +/− for å justere antall på hver bestillingslinje.
        </p>
        {/* Main order line */}
        <BirdAdjustLine
          label={fullOrder.chicken_breeds?.name || '—'}
          subLabel={`Hovedbestilling · ${fullOrder.age_weeks_at_pickup} uker`}
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
        />
        {additions.map((addition: any) => (
          <BirdAdjustLine
            key={addition.id}
            label={addition.chicken_breeds?.name || '—'}
            subLabel={`Tillegg`}
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
          />
        ))}
        <div className="flex justify-end pt-2">
          <Button onClick={onNext} disabled={!hasChanges} size="sm">
            Neste
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
          Hvor mange av de fjernede fuglene skal tilbake til lageret? Fugler som ikke legges tilbake
          regnes som korreksjoner.
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
                  {breedName} {isMain ? '(Hoved)' : '(Tillegg)'}
                </p>
                {delta.hensDelta < 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>{Math.abs(delta.hensDelta)} høner fjernet</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Tilbake til lager:</span>
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
                    <span>{Math.abs(delta.roostersDelta)} haner fjernet</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Tilbake til lager:</span>
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
            Tilbake
          </Button>
          <Button onClick={onNext} size="sm">
            Neste
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
                <p className="font-medium">{breedName} {isMain ? '(Hoved)' : '(Tillegg)'}:</p>
                {delta.hensDelta !== 0 && (
                  <p className="ml-3 text-xs">
                    Høner: {delta.hensDelta > 0 ? '+' : ''}{delta.hensDelta}
                    {delta.hensDelta < 0 && pr.poolHensReturn > 0 && (
                      <span className="text-green-700 ml-1">
                        ({pr.poolHensReturn} tilbake til lager)
                      </span>
                    )}
                    {delta.hensDelta > 0 && (
                      <span className="text-blue-700 ml-1">(øker lager)</span>
                    )}
                  </p>
                )}
                {delta.roostersDelta !== 0 && (
                  <p className="ml-3 text-xs">
                    Haner: {delta.roostersDelta > 0 ? '+' : ''}{delta.roostersDelta}
                    {delta.roostersDelta < 0 && pr.poolRoostersReturn > 0 && (
                      <span className="text-green-700 ml-1">
                        ({pr.poolRoostersReturn} tilbake til lager)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )
          })}
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-600">Notat (valgfritt)</label>
        <Input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Årsak til justering..."
          className="mt-1"
        />
      </div>
      <div className="flex justify-between pt-1">
        <Button variant="outline" onClick={onBack} size="sm">
          Tilbake
        </Button>
        <Button onClick={onSubmit} disabled={saving} size="sm">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Bekreft endring
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
            Standard boks
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
            Mangalitsa-pakke
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
            Tilbehør
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
        <label className="text-xs text-neutral-500 mb-1 block">Notat (valgfritt)</label>
        <Input
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Årsak til endring..."
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
              <span className="text-neutral-500">Boks/pakke</span>
              <span>{formatMoney(Number(selectedBoxPrice))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Tilbehør ({extraIds.length})</span>
              <span>{formatMoney(extrasTotal)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-neutral-200 pt-1 mt-1">
              <span>Ny total</span>
              <span>{formatMoney(newTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Depositum betalt</span>
              <span>{formatMoney(deposit)}</span>
            </div>
            <div
              className={`flex justify-between font-medium ${newRemainder > 0 ? 'text-amber-700' : 'text-green-700'}`}
            >
              <span>Ny rest</span>
              <span>{formatMoney(newRemainder)}</span>
            </div>
          </div>
        )
      })()}

      <Button onClick={onSave} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Lagre endringer
      </Button>
    </div>
  )
}
