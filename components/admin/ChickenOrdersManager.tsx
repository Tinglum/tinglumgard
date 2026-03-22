'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Search, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ChickenPayment {
  id: string
  payment_type: string
  status: string
  amount_nok: number
  paid_at?: string | null
  created_at?: string | null
}

interface ChickenOrderAddition {
  id: string
  hatch_id?: string | null
  quantity_hens: number
  quantity_roosters: number
  price_per_hen_nok?: number
  price_per_rooster_nok?: number
  subtotal_nok: number
  status: string
  created_at: string
  chicken_hatches?: { hatch_date?: string | null } | null
  chicken_breeds?: { name: string; slug: string; accent_color: string; rooster_price_nok?: number }
}

interface ChickenOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  quantity_hens: number
  quantity_roosters: number
  pickup_year: number
  pickup_week: number
  pickup_monday?: string | null
  age_weeks_at_pickup: number
  price_per_hen_nok: number
  price_per_rooster_nok?: number
  subtotal_nok: number
  delivery_fee_nok: number
  total_amount_nok: number
  deposit_amount_nok: number
  remainder_amount_nok: number
  remainder_payment_enabled?: boolean | null
  remainder_due_date?: string | null
  delivery_method: string
  status: string
  notes?: string | null
  admin_notes?: string | null
  shipping_address?: string | null
  shipping_postal_code?: string | null
  shipping_city?: string | null
  shipping_country?: string | null
  remainder_collected_at?: string | null
  remainder_collected_by?: string | null
  remainder_collection_note?: string | null
  created_at: string
  chicken_breeds?: { name: string; slug: string; accent_color: string }
  chicken_hatches?: { hatch_date: string }
  chicken_payments?: ChickenPayment[]
  chicken_order_additions?: ChickenOrderAddition[]
}

function safeText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function ensureObjectArray<T extends Record<string, any>>(value: T[] | null | undefined): T[] {
  return ensureArray(value).filter((item): item is T => Boolean(item) && typeof item === 'object')
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  deposit_paid: 'bg-blue-100 text-blue-800',
  fully_paid: 'bg-green-100 text-green-800',
  ready_for_pickup: 'bg-purple-100 text-purple-800',
  picked_up: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['deposit_paid', 'cancelled'],
  deposit_paid: ['fully_paid', 'cancelled'],
  fully_paid: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['picked_up'],
  picked_up: [],
  cancelled: [],
}

type ChickenOrdersManagerProps = {
  initialOrderId?: string | null
  onInitialOrderHandled?: () => void
}

export function ChickenOrdersManager({
  initialOrderId = null,
  onInitialOrderHandled,
}: ChickenOrdersManagerProps = {}) {
  const { toast } = useToast()
  const { t, lang } = useLanguage()
  const co = {
    loading: lang === 'en' ? 'Loading orders...' : 'Laster bestillinger...',
    errorFetchTitle: lang === 'en' ? 'Error' : 'Feil',
    errorFetchDescription: lang === 'en' ? 'Could not load orders' : 'Kunne ikke hente bestillinger',
    errorFetchDetailDescription:
      lang === 'en' ? 'Could not load order details' : 'Kunne ikke hente bestillingsdetaljer',
    updateToastTitle: lang === 'en' ? 'Updated' : 'Oppdatert',
    updateToastDescription: lang === 'en' ? 'Status changed to {status}' : 'Status endret til {status}',
    errorUpdateTitle: lang === 'en' ? 'Error' : 'Feil',
    errorUpdateDescription: lang === 'en' ? 'Could not update status' : 'Kunne ikke oppdatere status',
    errorCollectRemainderDescription:
      lang === 'en' ? 'Could not register remainder payment' : 'Kunne ikke registrere restbetaling',
    searchPlaceholder: lang === 'en' ? 'Search order, customer...' : 'Søk bestilling, kunde...',
    statusAll: lang === 'en' ? 'All' : 'Alle',
    statusPending: lang === 'en' ? 'Pending' : 'Venter',
    statusDepositPaid: lang === 'en' ? 'Deposit paid' : 'Forskudd betalt',
    statusFullyPaid: lang === 'en' ? 'Fully paid' : 'Fullt betalt',
    statusReadyForPickup: lang === 'en' ? 'Ready for pickup' : 'Klar for henting',
    statusPickedUp: lang === 'en' ? 'Picked up' : 'Hentet',
    statusCancelled: lang === 'en' ? 'Cancelled' : 'Kansellert',
    orderCount: lang === 'en' ? '{count} orders' : '{count} bestillinger',
    tableHeaderOrder: lang === 'en' ? 'Order' : 'Bestilling',
    tableHeaderCustomer: lang === 'en' ? 'Customer' : 'Kunde',
    tableHeaderBreed: lang === 'en' ? 'Breed' : 'Rase',
    tableHeaderQuantity: lang === 'en' ? 'Quantity' : 'Antall',
    tableHeaderPickup: lang === 'en' ? 'Pickup' : 'Henting',
    tableHeaderAge: lang === 'en' ? 'Age' : 'Alder',
    tableHeaderPricePerHen: lang === 'en' ? 'Price/hen' : 'Pris/høne',
    tableHeaderTotal: lang === 'en' ? 'Total' : 'Totalt',
    tableHeaderStatus: lang === 'en' ? 'Status' : 'Status',
    tableHeaderAction: lang === 'en' ? 'Action' : 'Handling',
    actionDropdownDefault: lang === 'en' ? 'Change...' : 'Endre...',
    unknownBreed: '-',
    notAvailable: lang === 'en' ? 'Not available' : 'Ikke tilgjengelig',
    detailTitle: lang === 'en' ? 'Order details {order}' : 'Ordredetaljer {order}',
    detailDescription:
      lang === 'en' ? 'Full overview of the chicken order.' : 'Full oversikt over kyllingbestillingen.',
    detailLoading: lang === 'en' ? 'Loading order details...' : 'Laster bestillingsdetaljer...',
    detailUnavailable: lang === 'en' ? 'Order details are not available.' : 'Bestillingsdetaljer er ikke tilgjengelige.',
    detailCustomerTitle: lang === 'en' ? 'Customer' : 'Kunde',
    detailOrderTitle: lang === 'en' ? 'Order' : 'Ordre',
    detailFinancialTitle: lang === 'en' ? 'Financials' : 'Beløp',
    detailDeliveryTitle: lang === 'en' ? 'Delivery' : 'Levering',
    detailNotesTitle: lang === 'en' ? 'Notes' : 'Notater',
    detailPaymentsTitle: lang === 'en' ? 'Payments' : 'Betalinger',
    detailAdditionsTitle: lang === 'en' ? 'Additions' : 'Tillegg',
    detailOrderLinesTitle: lang === 'en' ? 'Order lines' : 'Ordrelinjer',
    detailNoPayments: lang === 'en' ? 'No payments registered yet.' : 'Ingen betalinger registrert ennå.',
    detailNoAdditions: lang === 'en' ? 'No additions on this order.' : 'Ingen tillegg på denne bestillingen.',
    labelCustomerName: lang === 'en' ? 'Name' : 'Navn',
    labelEmail: lang === 'en' ? 'Email' : 'E-post',
    labelPhone: lang === 'en' ? 'Phone' : 'Telefon',
    labelOrderId: lang === 'en' ? 'Order ID' : 'Ordre-ID',
    labelStatus: lang === 'en' ? 'Status' : 'Status',
    labelCreatedAt: lang === 'en' ? 'Created' : 'Opprettet',
    labelBreed: lang === 'en' ? 'Breed' : 'Rase',
    labelHens: lang === 'en' ? 'Hens' : 'Høner',
    labelRoosters: lang === 'en' ? 'Roosters' : 'Haner',
    labelPickup: lang === 'en' ? 'Pickup' : 'Henting',
    labelPickupMonday: lang === 'en' ? 'Pickup Monday' : 'Hente-mandag',
    labelAgeWeeks: lang === 'en' ? 'Age' : 'Alder',
    ageWeeksLabel: lang === 'en' ? '{weeks} weeks' : '{weeks} uker',
    summaryBirdsLabel: lang === 'en' ? 'Total birds' : 'Totalt fugler',
    summaryPaidLabel: lang === 'en' ? 'Paid' : 'Betalt',
    summaryRemainingLabel: lang === 'en' ? 'Remaining' : 'Rest',
    summaryTotalLabel: lang === 'en' ? 'Order total' : 'Ordretotal',
    labelSubtotal: lang === 'en' ? 'Subtotal' : 'Delsum',
    labelDeliveryFee: lang === 'en' ? 'Delivery fee' : 'Levering',
    labelTotal: lang === 'en' ? 'Total' : 'Totalt',
    labelDeposit: lang === 'en' ? 'Deposit' : 'Forskudd',
    labelRemainder: lang === 'en' ? 'Remainder' : 'Rest',
    labelRemainderDueDate: lang === 'en' ? 'Remainder due date' : 'Frist restbetaling',
    labelRemainderCollected: lang === 'en' ? 'Remainder collected' : 'Rest registrert',
    labelRemainderCollectedBy: lang === 'en' ? 'Collected by' : 'Registrert av',
    labelDeliveryMethod: lang === 'en' ? 'Delivery method' : 'Leveringsmåte',
    labelShippingAddress: lang === 'en' ? 'Address' : 'Adresse',
    labelShippingPostalCode: lang === 'en' ? 'Postal code' : 'Postnummer',
    labelShippingCity: lang === 'en' ? 'City' : 'By',
    labelShippingCountry: lang === 'en' ? 'Country' : 'Land',
    labelCustomerNotes: lang === 'en' ? 'Customer note' : 'Kundenotat',
    labelAdminNotes: lang === 'en' ? 'Admin note' : 'Adminnotat',
    labelRemainderCollectionNote: lang === 'en' ? 'Remainder note' : 'Notat restbetaling',
    labelPaymentType: lang === 'en' ? 'Type' : 'Type',
    labelPaymentStatus: lang === 'en' ? 'Payment status' : 'Betalingsstatus',
    labelPaymentAmount: lang === 'en' ? 'Amount' : 'Beløp',
    labelPaymentWhen: lang === 'en' ? 'Time' : 'Tid',
    labelAdditionQuantity: lang === 'en' ? 'Quantity' : 'Antall tillegg',
    labelAdditionSubtotal: lang === 'en' ? 'Subtotal' : 'Tillegg sum',
    pickupWeekLabel: lang === 'en' ? 'Week {week}/{year}' : 'Uke {week}/{year}',
    viewDetailsButton: lang === 'en' ? 'Details' : 'Detaljer',
    collectRemainderButton: lang === 'en' ? 'Register remainder' : 'Registrer rest',
    enableRemainderButton: lang === 'en' ? 'Enable remainder payment' : 'Aktiver restbetaling',
    remainderEnabled: lang === 'en' ? 'Remainder enabled ✓' : 'Rest aktivert ✓',
    enableRemainderSuccess:
      lang === 'en' ? 'Remainder payment enabled for customer.' : 'Restbetaling er aktivert for kunden.',
    errorEnableRemainderDescription:
      lang === 'en' ? 'Could not enable remainder payment.' : 'Kunne ikke aktivere restbetaling.',
    promptRemainderAmount: lang === 'en' ? 'Remainder amount in NOK' : 'Restbeløp i kroner',
    promptOptionalNote: lang === 'en' ? 'Optional note' : 'Valgfritt notat',
    invalidAmountDescription: lang === 'en' ? 'Please enter a valid amount.' : 'Legg inn et gyldig beløp.',
    remainderRegisteredTitle: lang === 'en' ? 'Remainder registered' : 'Rest registrert',
    remainderRegisteredDescription:
      lang === 'en' ? 'Registered payment of {amount}.' : 'Registrerte betaling på {amount}.',
    resendButton: lang === 'en' ? 'Resend confirmation' : 'Send bekreftelse på nytt',
    resendSending: lang === 'en' ? 'Sending...' : 'Sender...',
    resendSuccessTitle: lang === 'en' ? 'Confirmation resent' : 'Bekreftelse sendt på nytt',
    resendSuccessDescription:
      lang === 'en' ? 'The confirmation email was queued.' : 'Bekreftelseseposten ble lagt i kø.',
    resendFailedDescription:
      lang === 'en' ? 'Could not resend confirmation.' : 'Kunne ikke sende bekreftelse på nytt.',
    ...(((t as any).admin && (t as any).admin.chickenOrders) || {}),
  }
  const [orders, setOrders] = useState<ChickenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ChickenOrder | null>(null)
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null)
  const [activatingRemainderOrderId, setActivatingRemainderOrderId] = useState<string | null>(null)
  const [initialOrderHandled, setInitialOrderHandled] = useState(false)
  const [adjustBirdsOpen, setAdjustBirdsOpen] = useState(false)
  const [adjustBirdsStep, setAdjustBirdsStep] = useState<'edit' | 'pool' | 'confirm'>('edit')
  const [adjustBirdsLoading, setAdjustBirdsLoading] = useState(false)
  const [adjustDeltas, setAdjustDeltas] = useState<Record<string, { hensDelta: number; roostersDelta: number }>>({})
  const [poolReturns, setPoolReturns] = useState<Record<string, { poolHensReturn: number; poolRoostersReturn: number }>>({})
  const [adjustNote, setAdjustNote] = useState('')
  const locale = lang === 'en' ? 'en-US' : 'nb-NO'

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: co.statusAll },
      { value: 'pending', label: co.statusPending },
      { value: 'deposit_paid', label: co.statusDepositPaid },
      { value: 'fully_paid', label: co.statusFullyPaid },
      { value: 'ready_for_pickup', label: co.statusReadyForPickup },
      { value: 'picked_up', label: co.statusPickedUp },
      { value: 'cancelled', label: co.statusCancelled },
    ],
    [
      co.statusAll,
      co.statusPending,
      co.statusDepositPaid,
      co.statusFullyPaid,
      co.statusReadyForPickup,
      co.statusPickedUp,
      co.statusCancelled,
    ]
  )

  const statusLabelMap = useMemo(() => {
    return statusOptions.reduce<Record<string, string>>((map, entry) => {
      map[entry.value] = entry.label
      return map
    }, {})
  }, [statusOptions])

  const formatMoney = useCallback(
    (value: number | null | undefined) => `kr ${Math.round(Number(value || 0)).toLocaleString(locale)}`,
    [locale]
  )

  const formatDate = useCallback(
    (value: string | null | undefined) => {
      if (!value) return co.notAvailable
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return co.notAvailable
      return date.toLocaleDateString(locale)
    },
    [co.notAvailable, locale]
  )

  const formatDateTime = useCallback(
    (value: string | null | undefined) => {
      if (!value) return co.notAvailable
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return co.notAvailable
      return date.toLocaleString(locale)
    },
    [co.notAvailable, locale]
  )

  const getAdditionSubtotal = useCallback((addition: ChickenOrderAddition) => {
    const hens = Number(addition.quantity_hens || 0)
    const roosters = Number(addition.quantity_roosters || 0)
    const pricePerHen = Number(addition.price_per_hen_nok || 0)
    const pricePerRooster =
      Number(addition.price_per_rooster_nok || 0) || Number(addition.chicken_breeds?.rooster_price_nok || 0)
    const computed = hens * pricePerHen + roosters * pricePerRooster
    if (computed > 0) return computed
    return Number(addition.subtotal_nok || 0)
  }, [])

  const getAdditions = useCallback((order: ChickenOrder) => ensureObjectArray(order.chicken_order_additions), [])
  const getPayments = useCallback((order: ChickenOrder) => ensureObjectArray(order.chicken_payments), [])

  const getAgeWeeksForAddition = useCallback((order: ChickenOrder, addition: ChickenOrderAddition): number | null => {
    const hatchDate = addition.chicken_hatches?.hatch_date
    const pickupDate = order.pickup_monday
    if (!hatchDate || !pickupDate) return null
    const hatch = new Date(hatchDate)
    const pickup = new Date(pickupDate)
    if (!Number.isFinite(hatch.getTime()) || !Number.isFinite(pickup.getTime())) return null
    const diffMs = pickup.getTime() - hatch.getTime()
    if (!Number.isFinite(diffMs) || diffMs < 0) return null
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  }, [])

  const getOrderBirdTotals = useCallback((order: ChickenOrder) => {
    const additions = getAdditions(order)
    const additionsHens = additions.reduce(
      (sum, row) => sum + Number(row.quantity_hens || 0),
      0
    )
    const additionsRoosters = additions.reduce(
      (sum, row) => sum + Number(row.quantity_roosters || 0),
      0
    )

    const baseHens = Number(order.quantity_hens || 0)
    const baseRoosters = Number(order.quantity_roosters || 0)

    return {
      baseHens,
      baseRoosters,
      additionsHens,
      additionsRoosters,
      totalHens: baseHens + additionsHens,
      totalRoosters: baseRoosters + additionsRoosters,
    }
  }, [getAdditions])

  const getOrderFinancialTotals = useCallback((order: ChickenOrder) => {
    const additionsSubtotal = getAdditions(order).reduce(
      (sum, row) => sum + getAdditionSubtotal(row),
      0
    )
    const baseSubtotalByPricing =
      Number(order.quantity_hens || 0) * Number(order.price_per_hen_nok || 0) +
      Number(order.quantity_roosters || 0) * Number(order.price_per_rooster_nok || 0)
    const deliveryFee = Number(order.delivery_fee_nok || 0)
    const grandTotal = Number(order.total_amount_nok || 0)
    const reconciledBaseFromTotal = Math.max(0, grandTotal - deliveryFee - additionsSubtotal)
    const shouldReconcileBase =
      grandTotal > 0 &&
      Math.abs(baseSubtotalByPricing + additionsSubtotal + deliveryFee - grandTotal) > 1
    const baseSubtotal = shouldReconcileBase ? reconciledBaseFromTotal : baseSubtotalByPricing
    const paidTotal = getPayments(order).reduce((sum, payment) => {
      if (payment.status !== 'completed') return sum
      return sum + Number(payment.amount_nok || 0)
    }, 0)
    const remaining = Math.max(0, grandTotal - paidTotal)
    return { baseSubtotal, additionsSubtotal, deliveryFee, grandTotal, paidTotal, remaining }
  }, [getAdditionSubtotal, getAdditions, getPayments])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/chickens/orders')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const nextOrders = Array.isArray(data?.orders)
        ? data.orders.filter((order: unknown): order is ChickenOrder => Boolean(order) && typeof order === 'object')
        : []
      setOrders(nextOrders)
    } catch {
      toast({ title: co.errorFetchTitle, description: co.errorFetchDescription, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [co.errorFetchDescription, co.errorFetchTitle, toast])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    setInitialOrderHandled(false)
  }, [initialOrderId])

  const openOrderDetails = useCallback(
    async (orderId: string) => {
      const listOrder = orders.find((entry) => entry.id === orderId) || null
      setSelectedOrder(listOrder)
      setDetailOpen(true)
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/admin/chickens/orders/${orderId}`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setSelectedOrder(data && typeof data === 'object' ? data : null)
      } catch {
        toast({ title: co.errorFetchTitle, description: co.errorFetchDetailDescription, variant: 'destructive' })
      } finally {
        setDetailLoading(false)
      }
    },
    [co.errorFetchDetailDescription, co.errorFetchTitle, orders, toast]
  )

  useEffect(() => {
    if (!initialOrderId || initialOrderHandled || loading) return
    setInitialOrderHandled(true)
    void openOrderDetails(initialOrderId).finally(() => {
      onInitialOrderHandled?.()
    })
  }, [initialOrderHandled, initialOrderId, loading, onInitialOrderHandled, openOrderDetails])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: co.updateToastTitle, description: co.updateToastDescription.replace('{status}', newStatus) })
      fetchOrders()
    } catch {
      toast({ title: co.errorUpdateTitle, description: co.errorUpdateDescription, variant: 'destructive' })
    }
  }

  const handleCollectRemainder = async (order: ChickenOrder) => {
    const defaultAmount = Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)))
    const amountInput = window.prompt(co.promptRemainderAmount, String(defaultAmount))
    if (amountInput === null) return

    const amountNok = Number.parseInt(amountInput, 10)
    if (!Number.isFinite(amountNok) || amountNok < 0) {
      toast({ title: co.errorUpdateTitle, description: co.invalidAmountDescription, variant: 'destructive' })
      return
    }

    const note = window.prompt(co.promptOptionalNote, order.remainder_collection_note || '') || ''

    try {
      const res = await fetch(`/api/admin/chickens/orders/${order.id}/collect-remainder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountNok,
          note,
          sendReceipt: true,
          locale: 'no',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({
        title: co.remainderRegisteredTitle,
        description: co.remainderRegisteredDescription.replace('{amount}', formatMoney(amountNok)),
      })
      fetchOrders()
    } catch {
      toast({ title: co.errorUpdateTitle, description: co.errorCollectRemainderDescription, variant: 'destructive' })
    }
  }

  const canEnableRemainderPayment = useCallback(
    (order: ChickenOrder) => {
      const financial = getOrderFinancialTotals(order)
      return (
        order.remainder_payment_enabled !== true &&
        !order.remainder_collected_at &&
        order.status !== 'cancelled' &&
        order.status !== 'picked_up' &&
        order.status !== 'fully_paid' &&
        financial.remaining > 0
      )
    },
    [getOrderFinancialTotals]
  )

  const showRemainderEnabledBadge = useCallback(
    (order: ChickenOrder) => {
      const financial = getOrderFinancialTotals(order)
      return (
        order.remainder_payment_enabled === true &&
        !order.remainder_collected_at &&
        order.status !== 'cancelled' &&
        order.status !== 'picked_up' &&
        order.status !== 'fully_paid' &&
        financial.remaining > 0
      )
    },
    [getOrderFinancialTotals]
  )

  const handleEnableRemainder = async (order: ChickenOrder) => {
    try {
      setActivatingRemainderOrderId(order.id)
      const res = await fetch(`/api/admin/chickens/orders/${order.id}/enable-remainder`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to enable remainder payment')
      }

      toast({
        title: co.updateToastTitle,
        description: co.enableRemainderSuccess,
      })

      setOrders((current) =>
        current.map((entry) =>
          entry.id === order.id ? { ...entry, remainder_payment_enabled: true } : entry
        )
      )
      setSelectedOrder((current) =>
        current?.id === order.id ? { ...current, remainder_payment_enabled: true } : current
      )
      void fetchOrders()
    } catch (error: any) {
      toast({
        title: co.errorUpdateTitle,
        description: error?.message || co.errorEnableRemainderDescription,
        variant: 'destructive',
      })
    } finally {
      setActivatingRemainderOrderId((current) => (current === order.id ? null : current))
    }
  }

  const resendConfirmation = async (orderId: string) => {
    try {
      setResendingOrderId(orderId)
      const res = await fetch(`/api/admin/chickens/orders/${orderId}/resend-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeAdmin: true }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = typeof body?.details === 'string' && body.details.trim() ? `: ${body.details}` : ''
        throw new Error(`${body?.error || 'Failed to resend confirmation'}${details}`)
      }
      toast({
        title:
          co.resendSuccessTitle ||
          (lang === 'en' ? 'Confirmation resent' : 'Bekreftelse sendt på nytt'),
        description:
          co.resendSuccessDescription ||
          (lang === 'en'
            ? 'The confirmation email was queued.'
            : 'Bekreftelseseposten ble lagt i kø.'),
      })
    } catch (error: any) {
      toast({
        title: co.errorUpdateTitle,
        description:
          error?.message ||
          co.resendFailedDescription ||
          (lang === 'en' ? 'Could not resend confirmation.' : 'Kunne ikke sende bekreftelse på nytt.'),
        variant: 'destructive',
      })
    } finally {
      setResendingOrderId((current) => (current === orderId ? null : current))
    }
  }

  const openAdjustBirds = () => {
    if (!selectedOrder) return
    const initial: Record<string, { hensDelta: number; roostersDelta: number }> = {}
    initial['main'] = { hensDelta: 0, roostersDelta: 0 }
    for (const addition of getAdditions(selectedOrder)) {
      initial[addition.id] = { hensDelta: 0, roostersDelta: 0 }
    }
    setAdjustDeltas(initial)
    setPoolReturns({})
    setAdjustNote('')
    setAdjustBirdsStep('edit')
    setAdjustBirdsOpen(true)
  }

  const adjustBirdsHasSubtractions = () => {
    return Object.values(adjustDeltas).some((d) => d.hensDelta < 0 || d.roostersDelta < 0)
  }

  const adjustBirdsHasChanges = () => {
    return Object.values(adjustDeltas).some((d) => d.hensDelta !== 0 || d.roostersDelta !== 0)
  }

  const handleAdjustBirdsNext = () => {
    if (adjustBirdsStep === 'edit') {
      if (adjustBirdsHasSubtractions()) {
        // Initialize pool returns for subtracted lines
        const returns: Record<string, { poolHensReturn: number; poolRoostersReturn: number }> = {}
        for (const [key, delta] of Object.entries(adjustDeltas)) {
          if (delta.hensDelta < 0 || delta.roostersDelta < 0) {
            returns[key] = { poolHensReturn: 0, poolRoostersReturn: 0 }
          }
        }
        setPoolReturns(returns)
        setAdjustBirdsStep('pool')
      } else {
        setAdjustBirdsStep('confirm')
      }
    } else if (adjustBirdsStep === 'pool') {
      setAdjustBirdsStep('confirm')
    }
  }

  const handleAdjustBirdsBack = () => {
    if (adjustBirdsStep === 'pool') setAdjustBirdsStep('edit')
    else if (adjustBirdsStep === 'confirm') {
      if (adjustBirdsHasSubtractions()) setAdjustBirdsStep('pool')
      else setAdjustBirdsStep('edit')
    }
  }

  const submitAdjustBirds = async () => {
    if (!selectedOrder) return
    setAdjustBirdsLoading(true)
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

      const res = await fetch(`/api/admin/chickens/orders/${selectedOrder.id}/adjust-birds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments, adminNote: adjustNote }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || 'Failed to adjust birds')

      toast({
        title: lang === 'en' ? 'Order updated' : 'Bestilling oppdatert',
        description: lang === 'en' ? 'Bird quantities adjusted successfully.' : 'Antall fugler justert.',
      })
      setAdjustBirdsOpen(false)
      if (result.order) setSelectedOrder(result.order)
      fetchOrders()
    } catch (err: any) {
      toast({
        title: co.errorUpdateTitle,
        description: err?.message || (lang === 'en' ? 'Could not adjust birds' : 'Kunne ikke justere antall'),
        variant: 'destructive',
      })
    } finally {
      setAdjustBirdsLoading(false)
    }
  }

  const filtered = orders.filter((order) => {
    const orderNumber = safeText(order.order_number).toLowerCase()
    const customerName = safeText(order.customer_name).toLowerCase()
    const customerEmail = safeText(order.customer_email).toLowerCase()
    const normalizedSearch = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm ||
      orderNumber.includes(normalizedSearch) ||
      customerName.includes(normalizedSearch) ||
      customerEmail.includes(normalizedSearch)
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) return <div className="py-8 text-center text-gray-500">{co.loading}</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-10" placeholder={co.searchPlaceholder} value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="rounded-md border px-3 py-2 text-sm" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <p className="text-sm text-gray-500">{co.orderCount.replace('{count}', String(filtered.length))}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2 pr-3">{co.tableHeaderOrder}</th>
              <th className="pb-2 pr-3">{co.tableHeaderCustomer}</th>
              <th className="pb-2 pr-3">{co.tableHeaderBreed}</th>
              <th className="pb-2 pr-3">{co.tableHeaderQuantity}</th>
              <th className="pb-2 pr-3">{co.tableHeaderPickup}</th>
              <th className="pb-2 pr-3">{co.tableHeaderAge}</th>
              <th className="pb-2 pr-3">{co.tableHeaderPricePerHen}</th>
              <th className="pb-2 pr-3">{co.tableHeaderTotal}</th>
              <th className="pb-2 pr-3">{co.tableHeaderStatus}</th>
              <th className="pb-2">{co.tableHeaderAction}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const transitions = STATUS_TRANSITIONS[order.status] || []
              const totals = getOrderBirdTotals(order)
              const ages = Array.from(
                new Set(
                  [
                    Number(order.age_weeks_at_pickup || 0),
                    ...getAdditions(order)
                      .map((addition) => getAgeWeeksForAddition(order, addition) || 0),
                  ].filter((age) => Number.isFinite(age) && age > 0)
                )
              ).sort((a, b) => a - b)
              const ageSummary =
                ages.length === 0
                  ? co.notAvailable
                  : ages.length === 1
                    ? co.ageWeeksLabel.replace('{weeks}', String(ages[0]))
                    : `${ages[0]}-${ages[ages.length - 1]} ${lang === 'en' ? 'weeks' : 'uker'}`
              const isResending = resendingOrderId === order.id
              const isActivatingRemainder = activatingRemainderOrderId === order.id
              const canEnableRemainder = canEnableRemainderPayment(order)
              const remainderEnabled = showRemainderEnabledBadge(order)
              return (
                <tr
                  key={order.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-300"
                  role="button"
                  tabIndex={0}
                  aria-label={co.detailTitle.replace('{order}', order.order_number)}
                  onClick={() => void openOrderDetails(order.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      void openOrderDetails(order.id)
                    }
                  }}
                >
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void openOrderDetails(order.id)
                      }}
                      className="font-mono text-xs text-left underline-offset-2 hover:underline"
                    >
                      {order.order_number}
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="font-medium">{safeText(order.customer_name) || co.notAvailable}</div>
                    <div className="text-xs text-gray-500">{safeText(order.customer_email) || co.notAvailable}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: order.chicken_breeds?.accent_color || '#ccc' }} />
                      {order.chicken_breeds?.name || co.unknownBreed}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {totals.totalHens}H
                    {totals.totalRoosters > 0 && <span className="text-gray-500"> +{totals.totalRoosters}R</span>}
                    {(totals.additionsHens > 0 || totals.additionsRoosters > 0) && (
                      <div className="text-xs text-gray-500">
                        +{totals.additionsHens}H{totals.additionsRoosters > 0 ? ` +${totals.additionsRoosters}R` : ''} {co.detailAdditionsTitle}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3">{co.pickupWeekLabel.replace('{week}', String(order.pickup_week)).replace('{year}', String(order.pickup_year))}</td>
                  <td className="py-2 pr-3">{ageSummary}</td>
                  <td className="py-2 pr-3">{formatMoney(order.price_per_hen_nok)}</td>
                  <td className="py-2 pr-3 font-medium">{formatMoney(order.total_amount_nok)}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                      {statusLabelMap[order.status] || order.status}
                    </span>
                  </td>
                  <td className="py-2" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void openOrderDetails(order.id)}>
                        {co.viewDetailsButton}
                      </Button>
                      {transitions.length > 0 && (
                        <select className="text-xs border rounded px-1 py-0.5"
                          defaultValue="" onChange={(e) => { if (e.target.value) handleStatusChange(order.id, e.target.value) }}>
                          <option value="" disabled>{co.actionDropdownDefault}</option>
                          {transitions.map((s) => (
                            <option key={s} value={s}>{statusLabelMap[s] || s}</option>
                          ))}
                        </select>
                      )}
                      {!order.remainder_collected_at && order.status !== 'cancelled' && order.status !== 'picked_up' && Number(order.remainder_amount_nok || 0) > 0 && (
                        <Button size="sm" variant="outline" onClick={() => handleCollectRemainder(order)}>
                          {co.collectRemainderButton}
                        </Button>
                      )}
                      {canEnableRemainder && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleEnableRemainder(order)}
                          disabled={isActivatingRemainder}
                        >
                          {isActivatingRemainder ? co.resendSending : co.enableRemainderButton}
                        </Button>
                      )}
                      {remainderEnabled && (
                        <Button size="sm" variant="outline" disabled>
                          {co.remainderEnabled}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void resendConfirmation(order.id)}
                        disabled={isResending}
                      >
                        {isResending ? co.resendSending || (lang === 'en' ? 'Sending...' : 'Sender...') : (co.resendButton || (lang === 'en' ? 'Resend email' : 'Send e-post på nytt'))}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto !bg-white !text-neutral-900 shadow-2xl ring-1 ring-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-neutral-900">
              {co.detailTitle.replace('{order}', selectedOrder?.order_number || co.notAvailable)}
            </DialogTitle>
            <DialogDescription>{co.detailDescription}</DialogDescription>
          </DialogHeader>

          {detailLoading && (
            <div className="py-10 text-center text-sm text-gray-500">{co.detailLoading}</div>
          )}

          {!detailLoading && !selectedOrder && (
            <div className="py-10 text-center text-sm text-gray-500">{co.detailUnavailable}</div>
          )}

          {!detailLoading && selectedOrder && (
            <div className="space-y-4">
              {(() => {
                const totals = getOrderBirdTotals(selectedOrder)
                const financial = getOrderFinancialTotals(selectedOrder)
                return (
                  <div className="grid gap-3 md:grid-cols-4">
                    <MetricCard
                      label={co.summaryBirdsLabel || (lang === 'en' ? 'Total birds' : 'Totalt fugler')}
                      value={`${totals.totalHens}H${totals.totalRoosters > 0 ? ` + ${totals.totalRoosters}R` : ''}`}
                    />
                    <MetricCard
                      label={co.summaryPaidLabel || (lang === 'en' ? 'Paid' : 'Betalt')}
                      value={formatMoney(financial.paidTotal)}
                    />
                    <MetricCard
                      label={co.summaryRemainingLabel || (lang === 'en' ? 'Remaining' : 'Rest')}
                      value={formatMoney(financial.remaining)}
                    />
                    <MetricCard
                      label={co.summaryTotalLabel || (lang === 'en' ? 'Order total' : 'Ordretotal')}
                      value={formatMoney(financial.grandTotal)}
                    />
                  </div>
                )
              })()}

              <div className="grid gap-4 md:grid-cols-2">
                <CardSection title={co.detailCustomerTitle}>
                  <DetailRow label={co.labelCustomerName} value={selectedOrder.customer_name} />
                  <DetailRow label={co.labelEmail} value={selectedOrder.customer_email} />
                  <DetailRow label={co.labelPhone} value={selectedOrder.customer_phone || co.notAvailable} />
                </CardSection>

                <CardSection title={co.detailOrderTitle}>
                  <DetailRow label={co.labelOrderId} value={selectedOrder.id} />
                  <DetailRow label={co.labelStatus} value={statusLabelMap[selectedOrder.status] || selectedOrder.status} />
                  <DetailRow label={co.labelCreatedAt} value={formatDateTime(selectedOrder.created_at)} />
                  <DetailRow label={co.labelBreed} value={selectedOrder.chicken_breeds?.name || co.unknownBreed} />
                  <DetailRow label={co.labelHens} value={String(selectedOrder.quantity_hens)} />
                  <DetailRow label={co.labelRoosters} value={String(selectedOrder.quantity_roosters)} />
                  <DetailRow
                    label={co.labelPickup}
                    value={co.pickupWeekLabel.replace('{week}', String(selectedOrder.pickup_week)).replace('{year}', String(selectedOrder.pickup_year))}
                  />
                  <DetailRow label={co.labelPickupMonday} value={formatDate(selectedOrder.pickup_monday || null)} />
                  <DetailRow label={co.labelAgeWeeks} value={co.ageWeeksLabel.replace('{weeks}', String(selectedOrder.age_weeks_at_pickup))} />
                  {(() => {
                    const totals = getOrderBirdTotals(selectedOrder)
                    return (
                      <>
                        <DetailRow
                          label={co.summaryBirdsLabel || (lang === 'en' ? 'Total birds' : 'Totalt fugler')}
                          value={`${totals.totalHens}H${totals.totalRoosters > 0 ? ` + ${totals.totalRoosters}R` : ''}`}
                        />
                        {(totals.additionsHens > 0 || totals.additionsRoosters > 0) && (
                          <DetailRow
                            label={co.detailAdditionsTitle}
                            value={`+${totals.additionsHens}H${totals.additionsRoosters > 0 ? ` + ${totals.additionsRoosters}R` : ''}`}
                          />
                        )}
                      </>
                    )
                  })()}
                </CardSection>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CardSection title={co.detailFinancialTitle}>
                  {(() => {
                    const financial = getOrderFinancialTotals(selectedOrder)
                    return (
                      <>
                        <DetailRow label={co.labelSubtotal} value={formatMoney(financial.baseSubtotal)} />
                        <DetailRow
                          label={co.detailAdditionsTitle}
                          value={formatMoney(financial.additionsSubtotal)}
                        />
                      </>
                    )
                  })()}
                  <DetailRow label={co.labelDeliveryFee} value={formatMoney(selectedOrder.delivery_fee_nok)} />
                  <DetailRow label={co.labelTotal} value={formatMoney(selectedOrder.total_amount_nok)} />
                  <DetailRow label={co.labelDeposit} value={formatMoney(selectedOrder.deposit_amount_nok)} />
                  <DetailRow label={co.labelRemainder} value={formatMoney(selectedOrder.remainder_amount_nok)} />
                  <DetailRow label={co.labelRemainderDueDate} value={formatDate(selectedOrder.remainder_due_date || null)} />
                  <DetailRow label={co.labelRemainderCollected} value={formatDateTime(selectedOrder.remainder_collected_at || null)} />
                  <DetailRow label={co.labelRemainderCollectedBy} value={selectedOrder.remainder_collected_by || co.notAvailable} />
                </CardSection>

                <CardSection title={co.detailDeliveryTitle}>
                  <DetailRow label={co.labelDeliveryMethod} value={selectedOrder.delivery_method || co.notAvailable} />
                  <DetailRow label={co.labelShippingAddress} value={selectedOrder.shipping_address || co.notAvailable} />
                  <DetailRow label={co.labelShippingPostalCode} value={selectedOrder.shipping_postal_code || co.notAvailable} />
                  <DetailRow label={co.labelShippingCity} value={selectedOrder.shipping_city || co.notAvailable} />
                  <DetailRow label={co.labelShippingCountry} value={selectedOrder.shipping_country || co.notAvailable} />
                </CardSection>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CardSection title={co.detailNotesTitle}>
                  <DetailRow label={co.labelCustomerNotes} value={selectedOrder.notes || co.notAvailable} multiline />
                  <DetailRow label={co.labelAdminNotes} value={selectedOrder.admin_notes || co.notAvailable} multiline />
                  <DetailRow
                    label={co.labelRemainderCollectionNote}
                    value={selectedOrder.remainder_collection_note || co.notAvailable}
                    multiline
                  />
                </CardSection>

                <CardSection title={co.detailPaymentsTitle}>
                  {getPayments(selectedOrder).length === 0 && (
                    <p className="text-sm text-gray-500">{co.detailNoPayments}</p>
                  )}
                  {getPayments(selectedOrder).map((payment) => (
                    <div key={payment.id} className="rounded border border-gray-200 p-3 text-sm space-y-1">
                      <DetailRow label={co.labelPaymentType} value={payment.payment_type} />
                      <DetailRow label={co.labelPaymentStatus} value={statusLabelMap[payment.status] || payment.status} />
                      <DetailRow label={co.labelPaymentAmount} value={formatMoney(payment.amount_nok)} />
                      <DetailRow label={co.labelPaymentWhen} value={formatDateTime(payment.paid_at || payment.created_at || null)} />
                    </div>
                  ))}
                </CardSection>
              </div>

              <CardSection title={co.detailAdditionsTitle}>
                {(() => {
                  const financial = getOrderFinancialTotals(selectedOrder)
                  return (
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <h5 className="mb-2 text-sm font-semibold text-neutral-900">
                    {co.detailOrderLinesTitle || (lang === 'en' ? 'Order lines' : 'Ordrelinjer')}
                  </h5>
                  <div className="space-y-2">
                    <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
                      <DetailRow label={co.labelBreed} value={selectedOrder.chicken_breeds?.name || co.unknownBreed} />
                      <DetailRow
                        label={co.labelAdditionQuantity}
                        value={`${co.labelHens}: ${selectedOrder.quantity_hens}, ${co.labelRoosters}: ${selectedOrder.quantity_roosters}`}
                      />
                      <DetailRow
                        label={co.labelAgeWeeks}
                        value={co.ageWeeksLabel.replace('{weeks}', String(selectedOrder.age_weeks_at_pickup))}
                      />
                      <DetailRow label={co.labelAdditionSubtotal} value={formatMoney(financial.baseSubtotal)} />
                    </div>
                    {getAdditions(selectedOrder).map((addition) => (
                      <div key={addition.id} className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
                        {(() => {
                          const additionAge = getAgeWeeksForAddition(selectedOrder, addition)
                          return (
                            <>
                        <DetailRow label={co.labelBreed} value={addition.chicken_breeds?.name || co.unknownBreed} />
                        <DetailRow
                          label={co.labelAdditionQuantity}
                          value={`${co.labelHens}: ${addition.quantity_hens}, ${co.labelRoosters}: ${addition.quantity_roosters}`}
                        />
                        <DetailRow
                          label={co.labelAgeWeeks}
                          value={
                            additionAge !== null
                              ? co.ageWeeksLabel.replace('{weeks}', String(additionAge))
                              : co.notAvailable
                          }
                        />
                        <DetailRow label={co.labelAdditionSubtotal} value={formatMoney(getAdditionSubtotal(addition))} />
                            </>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
                  )
                })()}

                {getAdditions(selectedOrder).length === 0 && (
                  <p className="text-sm text-gray-500">{co.detailNoAdditions}</p>
                )}
              </CardSection>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'picked_up' && (
                  <Button variant="outline" onClick={openAdjustBirds}>
                    {lang === 'en' ? 'Edit quantities' : 'Endre antall'}
                  </Button>
                )}
                {canEnableRemainderPayment(selectedOrder) && (
                  <Button
                    variant="outline"
                    onClick={() => void handleEnableRemainder(selectedOrder)}
                    disabled={activatingRemainderOrderId === selectedOrder.id}
                  >
                    {activatingRemainderOrderId === selectedOrder.id ? co.resendSending : co.enableRemainderButton}
                  </Button>
                )}
                {showRemainderEnabledBadge(selectedOrder) && (
                  <Button variant="outline" disabled>
                    {co.remainderEnabled}
                  </Button>
                )}
                {!selectedOrder.remainder_collected_at &&
                  selectedOrder.status !== 'cancelled' &&
                  selectedOrder.status !== 'picked_up' &&
                  Number(selectedOrder.remainder_amount_nok || 0) > 0 && (
                    <Button variant="outline" onClick={() => handleCollectRemainder(selectedOrder)}>
                      {co.collectRemainderButton}
                    </Button>
                  )}
                <Button
                  variant="outline"
                  onClick={() => void resendConfirmation(selectedOrder.id)}
                  disabled={resendingOrderId === selectedOrder.id}
                >
                  {resendingOrderId === selectedOrder.id
                    ? co.resendSending || (lang === 'en' ? 'Sending...' : 'Sender...')
                    : (co.resendButton || (lang === 'en' ? 'Resend confirmation' : 'Send bekreftelse på nytt'))}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Birds Dialog */}
      <Dialog open={adjustBirdsOpen} onOpenChange={setAdjustBirdsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {lang === 'en' ? 'Edit bird quantities' : 'Endre antall fugler'}
            </DialogTitle>
            <DialogDescription>
              {adjustBirdsStep === 'edit' && (lang === 'en'
                ? 'Use +/- to adjust quantities on each order line.'
                : 'Bruk +/- for å justere antall på hver ordrelinje.')}
              {adjustBirdsStep === 'pool' && (lang === 'en'
                ? 'How many removed birds should go back to the pool?'
                : 'Hvor mange av de fjernede fuglene skal tilbake til lageret?')}
              {adjustBirdsStep === 'confirm' && (lang === 'en'
                ? 'Review changes before confirming.'
                : 'Gjennomgå endringene før du bekrefter.')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && adjustBirdsStep === 'edit' && (
            <div className="space-y-4 py-2">
              {/* Main order line */}
              <AdjustBirdLine
                label={selectedOrder.chicken_breeds?.name || '-'}
                subLabel={`${lang === 'en' ? 'Main order' : 'Hovedbestilling'} · ${selectedOrder.age_weeks_at_pickup} ${lang === 'en' ? 'weeks' : 'uker'}`}
                currentHens={selectedOrder.quantity_hens}
                currentRoosters={selectedOrder.quantity_roosters}
                hensDelta={adjustDeltas['main']?.hensDelta || 0}
                roostersDelta={adjustDeltas['main']?.roostersDelta || 0}
                onHensDelta={(d) => setAdjustDeltas((prev) => ({ ...prev, main: { ...prev['main'], hensDelta: d } }))}
                onRoostersDelta={(d) => setAdjustDeltas((prev) => ({ ...prev, main: { ...prev['main'], roostersDelta: d } }))}
                lang={lang}
              />
              {/* Addition lines */}
              {getAdditions(selectedOrder).map((addition) => {
                const additionAge = getAgeWeeksForAddition(selectedOrder, addition)
                const ageStr = additionAge !== null ? ` · ${additionAge} ${lang === 'en' ? 'weeks' : 'uker'}` : ''
                return (
                <AdjustBirdLine
                  key={addition.id}
                  label={addition.chicken_breeds?.name || '-'}
                  subLabel={`${lang === 'en' ? 'Addition' : 'Tillegg'}${ageStr}`}
                  currentHens={addition.quantity_hens}
                  currentRoosters={addition.quantity_roosters}
                  hensDelta={adjustDeltas[addition.id]?.hensDelta || 0}
                  roostersDelta={adjustDeltas[addition.id]?.roostersDelta || 0}
                  onHensDelta={(d) => setAdjustDeltas((prev) => ({ ...prev, [addition.id]: { ...prev[addition.id], hensDelta: d } }))}
                  onRoostersDelta={(d) => setAdjustDeltas((prev) => ({ ...prev, [addition.id]: { ...prev[addition.id], roostersDelta: d } }))}
                  lang={lang}
                />
                )
              })}
            </div>
          )}

          {selectedOrder && adjustBirdsStep === 'pool' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-neutral-600">
                {lang === 'en'
                  ? 'Birds not returned to pool are treated as corrections (e.g. sexing errors).'
                  : 'Fugler som ikke legges tilbake regnes som korreksjoner (f.eks. feil i kjønnsfordeling).'}
              </p>
              {Object.entries(adjustDeltas)
                .filter(([, d]) => d.hensDelta < 0 || d.roostersDelta < 0)
                .map(([key, delta]) => {
                  const isMain = key === 'main'
                  const addition = !isMain ? getAdditions(selectedOrder).find((a) => a.id === key) : null
                  const breedName = isMain
                    ? selectedOrder.chicken_breeds?.name || '-'
                    : addition?.chicken_breeds?.name || '-'
                  const ageWeeks = isMain
                    ? selectedOrder.age_weeks_at_pickup
                    : addition ? getAgeWeeksForAddition(selectedOrder, addition) : null
                  const ageStr = ageWeeks !== null ? ` · ${ageWeeks} ${lang === 'en' ? 'wk' : 'u'}` : ''
                  const pr = poolReturns[key] || { poolHensReturn: 0, poolRoostersReturn: 0 }

                  return (
                    <div key={key} className="rounded border border-neutral-200 p-3 space-y-2">
                      <p className="text-sm font-medium">{breedName} {isMain ? (lang === 'en' ? '(Main)' : '(Hoved)') : (lang === 'en' ? '(Addition)' : '(Tillegg)')}{ageStr}</p>
                      {delta.hensDelta < 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span>{lang === 'en' ? `${Math.abs(delta.hensDelta)} hens removed` : `${Math.abs(delta.hensDelta)} høner fjernet`}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500">{lang === 'en' ? 'Return to pool:' : 'Tilbake til lager:'}</span>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => setPoolReturns((prev) => ({
                                ...prev, [key]: { ...pr, poolHensReturn: Math.max(0, pr.poolHensReturn - 1) }
                              }))}
                              disabled={pr.poolHensReturn <= 0}
                            >−</Button>
                            <span className="w-6 text-center font-medium">{pr.poolHensReturn}</span>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => setPoolReturns((prev) => ({
                                ...prev, [key]: { ...pr, poolHensReturn: Math.min(Math.abs(delta.hensDelta), pr.poolHensReturn + 1) }
                              }))}
                              disabled={pr.poolHensReturn >= Math.abs(delta.hensDelta)}
                            >+</Button>
                          </div>
                        </div>
                      )}
                      {delta.roostersDelta < 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span>{lang === 'en' ? `${Math.abs(delta.roostersDelta)} roosters removed` : `${Math.abs(delta.roostersDelta)} haner fjernet`}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500">{lang === 'en' ? 'Return to pool:' : 'Tilbake til lager:'}</span>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => setPoolReturns((prev) => ({
                                ...prev, [key]: { ...pr, poolRoostersReturn: Math.max(0, pr.poolRoostersReturn - 1) }
                              }))}
                              disabled={pr.poolRoostersReturn <= 0}
                            >−</Button>
                            <span className="w-6 text-center font-medium">{pr.poolRoostersReturn}</span>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => setPoolReturns((prev) => ({
                                ...prev, [key]: { ...pr, poolRoostersReturn: Math.min(Math.abs(delta.roostersDelta), pr.poolRoostersReturn + 1) }
                              }))}
                              disabled={pr.poolRoostersReturn >= Math.abs(delta.roostersDelta)}
                            >+</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {selectedOrder && adjustBirdsStep === 'confirm' && (
            <div className="space-y-3 py-2">
              <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm space-y-1">
                {Object.entries(adjustDeltas)
                  .filter(([, d]) => d.hensDelta !== 0 || d.roostersDelta !== 0)
                  .map(([key, delta]) => {
                    const isMain = key === 'main'
                    const addition = !isMain ? getAdditions(selectedOrder).find((a) => a.id === key) : null
                    const breedName = isMain
                      ? selectedOrder.chicken_breeds?.name || '-'
                      : addition?.chicken_breeds?.name || '-'
                    const ageWeeks = isMain
                      ? selectedOrder.age_weeks_at_pickup
                      : addition ? getAgeWeeksForAddition(selectedOrder, addition) : null
                    const ageStr = ageWeeks !== null ? ` (${ageWeeks} ${lang === 'en' ? 'wk' : 'u'})` : ''
                    const pr = poolReturns[key] || { poolHensReturn: 0, poolRoostersReturn: 0 }

                    return (
                      <div key={key}>
                        <p className="font-medium">{breedName}{ageStr}:</p>
                        {delta.hensDelta !== 0 && (
                          <p className="ml-2">
                            {lang === 'en' ? 'Hens' : 'Høner'}: {delta.hensDelta > 0 ? '+' : ''}{delta.hensDelta}
                            {delta.hensDelta < 0 && pr.poolHensReturn > 0 && (
                              <span className="text-green-700 ml-1">
                                ({pr.poolHensReturn} {lang === 'en' ? 'back to pool' : 'tilbake til lager'})
                              </span>
                            )}
                            {delta.hensDelta > 0 && (
                              <span className="text-blue-700 ml-1">
                                ({lang === 'en' ? '+1 pool increase' : 'øker lager'})
                              </span>
                            )}
                          </p>
                        )}
                        {delta.roostersDelta !== 0 && (
                          <p className="ml-2">
                            {lang === 'en' ? 'Roosters' : 'Haner'}: {delta.roostersDelta > 0 ? '+' : ''}{delta.roostersDelta}
                            {delta.roostersDelta < 0 && pr.poolRoostersReturn > 0 && (
                              <span className="text-green-700 ml-1">
                                ({pr.poolRoostersReturn} {lang === 'en' ? 'back to pool' : 'tilbake til lager'})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    )
                  })}
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">{lang === 'en' ? 'Note (optional)' : 'Notat (valgfritt)'}</label>
                <Input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder={lang === 'en' ? 'Reason for adjustment...' : 'Årsak til justering...'}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <div>
              {adjustBirdsStep !== 'edit' && (
                <Button variant="outline" onClick={handleAdjustBirdsBack}>
                  {lang === 'en' ? 'Back' : 'Tilbake'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAdjustBirdsOpen(false)}>
                {lang === 'en' ? 'Cancel' : 'Avbryt'}
              </Button>
              {adjustBirdsStep === 'confirm' ? (
                <Button onClick={submitAdjustBirds} disabled={adjustBirdsLoading}>
                  {adjustBirdsLoading
                    ? (lang === 'en' ? 'Saving...' : 'Lagrer...')
                    : (lang === 'en' ? 'Confirm changes' : 'Bekreft endring')}
                </Button>
              ) : (
                <Button onClick={handleAdjustBirdsNext} disabled={!adjustBirdsHasChanges()}>
                  {lang === 'en' ? 'Next' : 'Neste'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdjustBirdLine({
  label,
  subLabel,
  currentHens,
  currentRoosters,
  hensDelta,
  roostersDelta,
  onHensDelta,
  onRoostersDelta,
  lang,
}: {
  label: string
  subLabel: string
  currentHens: number
  currentRoosters: number
  hensDelta: number
  roostersDelta: number
  onHensDelta: (d: number) => void
  onRoostersDelta: (d: number) => void
  lang: string
}) {
  return (
    <div className="rounded border border-neutral-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-neutral-500">{subLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-12">{lang === 'en' ? 'Hens' : 'Høner'}</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0"
            onClick={() => onHensDelta(hensDelta - 1)}
            disabled={currentHens + hensDelta <= 0}
          >−</Button>
          <span className={`w-10 text-center text-sm font-medium ${hensDelta !== 0 ? (hensDelta > 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
            {currentHens + hensDelta}
            {hensDelta !== 0 && <span className="text-xs"> ({hensDelta > 0 ? '+' : ''}{hensDelta})</span>}
          </span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0"
            onClick={() => onHensDelta(hensDelta + 1)}
          >+</Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-12">{lang === 'en' ? 'Roosters' : 'Haner'}</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0"
            onClick={() => onRoostersDelta(roostersDelta - 1)}
            disabled={currentRoosters + roostersDelta <= 0}
          >−</Button>
          <span className={`w-10 text-center text-sm font-medium ${roostersDelta !== 0 ? (roostersDelta > 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
            {currentRoosters + roostersDelta}
            {roostersDelta !== 0 && <span className="text-xs"> ({roostersDelta > 0 ? '+' : ''}{roostersDelta})</span>}
          </span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0"
            onClick={() => onRoostersDelta(roostersDelta + 1)}
          >+</Button>
        </div>
      </div>
    </div>
  )
}

function CardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 space-y-2 shadow-sm">
      <h4 className="font-semibold text-sm text-neutral-900">{title}</h4>
      {children}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  )
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className={`grid grid-cols-[150px_1fr] gap-2 text-sm ${multiline ? 'items-start' : 'items-center'}`}>
      <span className="text-neutral-600">{label}</span>
      <span className={`${multiline ? 'whitespace-pre-wrap' : ''} text-neutral-900`}>{value}</span>
    </div>
  )
}
