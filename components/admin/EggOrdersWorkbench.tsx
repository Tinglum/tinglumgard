'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileText,
  KanbanSquare,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Timer,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type PaymentState = 'deposit_pending' | 'remainder_due' | 'fully_paid' | 'refunded' | 'failed'

interface EggPayment {
  id: string
  payment_type: 'deposit' | 'remainder'
  status: string
  amount_nok: number
  paid_at: string | null
  created_at: string
}

interface EggBreed {
  id: string
  name: string
  slug?: string
}

interface EggInventory {
  id: string
  week_number?: number
  year?: number
  delivery_monday?: string
  status?: string
}

interface EggAddition {
  id: string
  quantity: number
  subtotal: number
  egg_breeds?: EggBreed | null
  egg_inventory?: EggInventory | null
}

interface EggOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  shipping_name?: string | null
  shipping_email?: string | null
  shipping_phone?: string | null
  shipping_address?: string | null
  shipping_postal_code?: string | null
  shipping_city?: string | null
  shipping_country?: string | null
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
  remainder_due_date: string | null
  status: string
  notes: string | null
  admin_notes: string | null
  locked_at: string | null
  marked_delivered_at: string | null
  tracking_number: string | null
  created_at: string
  egg_breeds?: EggBreed | null
  egg_inventory?: EggInventory | null
  egg_payments?: EggPayment[]
  egg_order_additions?: EggAddition[]
}

interface EggOrdersSummary {
  totalOrders: number
  filteredOrders: number
  pendingDeposit: number
  remainderDue: number
  fullyPaid: number
  refunded: number
  failedPayments: number
  atRisk: number
  shippingMissing: number
  revenueOre: number
  outstandingOre: number
}

interface WeekOption {
  value: string
  year: number
  week: number
  label: string
}

interface EggOrderFormState {
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingName: string
  shippingEmail: string
  shippingPhone: string
  shippingAddress: string
  shippingPostalCode: string
  shippingCity: string
  shippingCountry: string
  quantity: string
  pricePerEgg: string
  deliveryMethod: string
  deliveryFee: string
  depositAmount: string
  remainderAmount: string
  status: string
  notes: string
  adminNotes: string
  appendAdminNote: string
  lockOrder: boolean
}

type EggOrdersWorkbenchProps = {
  initialOrderId?: string | null
  onInitialOrderHandled?: () => void
  onNavigateToCustomer?: (customerId: string) => void
}

const STATUS_OPTIONS = [
  'pending',
  'deposit_paid',
  'fully_paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'forfeited',
] as const

const PAYMENT_OPTIONS: Array<'all' | PaymentState> = [
  'all',
  'deposit_pending',
  'remainder_due',
  'fully_paid',
  'refunded',
  'failed',
]

const DELIVERY_OPTIONS = ['all', 'posten', 'e6_pickup', 'farm_pickup'] as const

const SORT_OPTIONS = [
  'newest',
  'oldest',
  'customer_asc',
  'customer_desc',
  'delivery_asc',
  'delivery_desc',
  'payment_asc',
  'payment_desc',
  'status_asc',
  'status_desc',
  'amount_desc',
  'amount_asc',
  'week_asc',
  'week_desc',
] as const

function SortableHeader({ label, sortKey, currentSort, onSort, ascKey, descKey }: {
  label: string
  sortKey: string
  currentSort: string
  onSort: (value: string) => void
  ascKey: string
  descKey: string
}) {
  const isAsc = currentSort === ascKey
  const isDesc = currentSort === descKey
  const isActive = isAsc || isDesc

  const handleClick = () => {
    if (isAsc) onSort(descKey)
    else if (isDesc) onSort(ascKey)
    else onSort(ascKey)
  }

  return (
    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left">
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1 text-xs sm:text-sm font-medium transition-colors',
          isActive ? 'text-neutral-900' : 'text-neutral-700 hover:text-neutral-900'
        )}
      >
        {label}
        {isAsc ? <ChevronUp className="w-3.5 h-3.5" /> :
         isDesc ? <ChevronDown className="w-3.5 h-3.5" /> :
         <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />}
      </button>
    </th>
  )
}

const EMPTY_SUMMARY: EggOrdersSummary = {
  totalOrders: 0,
  filteredOrders: 0,
  pendingDeposit: 0,
  remainderDue: 0,
  fullyPaid: 0,
  refunded: 0,
  failedPayments: 0,
  atRisk: 0,
  shippingMissing: 0,
  revenueOre: 0,
  outstandingOre: 0,
}

function getDefaultDeliveryFee(method: string): number {
  if (method === 'posten') return 30000
  if (method === 'e6_pickup') return 20000
  return 0
}

function getPaymentState(order: EggOrder): PaymentState {
  const payments = order.egg_payments || []
  const hasRefunded = payments.some((payment) => payment.status === 'refunded')
  if (hasRefunded) return 'refunded'

  const hasFailed = payments.some((payment) => payment.status === 'failed')
  const depositPaid = payments.some(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )

  if (!depositPaid) {
    return hasFailed ? 'failed' : 'deposit_pending'
  }

  const remainderPaidOre =
    payments.reduce((sum, payment) => {
      if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
      return sum + (payment.amount_nok || 0) * 100
    }, 0) || 0
  const due = Math.max(0, (order.remainder_amount || 0) - remainderPaidOre)
  if (due <= 0) return 'fully_paid'
  return hasFailed ? 'failed' : 'remainder_due'
}

function paymentBadgeClass(state: PaymentState): string {
  if (state === 'fully_paid') return 'bg-emerald-100 text-emerald-800'
  if (state === 'remainder_due') return 'bg-amber-100 text-amber-800'
  if (state === 'deposit_pending') return 'bg-orange-100 text-orange-800'
  if (state === 'refunded') return 'bg-slate-200 text-slate-800'
  return 'bg-red-100 text-red-800'
}

function isAtRiskOrder(order: EggOrder): boolean {
  if (['cancelled', 'forfeited', 'delivered'].includes(order.status)) return false
  if (!order.remainder_due_date) return false

  const paymentState = getPaymentState(order)
  if (paymentState !== 'remainder_due') return false

  const due = new Date(order.remainder_due_date)
  const today = new Date(new Date().toISOString().split('T')[0])
  const days = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return days <= 2
}

function hasMissingShipping(order: EggOrder): boolean {
  if (order.delivery_method !== 'posten') return false
  if (['shipped', 'delivered', 'cancelled', 'forfeited'].includes(order.status)) return false
  const hasShippingName = Boolean(String(order.shipping_name || order.customer_name || '').trim())
  const hasShippingPhone = Boolean(String(order.shipping_phone || order.customer_phone || '').trim())
  const hasShippingAddress = Boolean(String(order.shipping_address || '').trim())
  const hasShippingPostalCode = Boolean(String(order.shipping_postal_code || '').trim())
  const hasShippingCity = Boolean(String(order.shipping_city || '').trim())
  return !(hasShippingName && hasShippingPhone && hasShippingAddress && hasShippingPostalCode && hasShippingCity)
}

function daysUntilDate(dateStr: string): number {
  const due = new Date(dateStr)
  const today = new Date(new Date().toISOString().split('T')[0])
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getEggQuantities(order: Pick<EggOrder, 'quantity' | 'egg_order_additions'>) {
  const base = Number(order.quantity || 0)
  const additions = (order.egg_order_additions || []).reduce(
    (sum, addition) => sum + Number(addition.quantity || 0),
    0
  )
  const total = base + additions
  return { base, additions, total }
}

function resolveCustomerLookup(customerEmail?: string | null, customerPhone?: string | null): string | null {
  const email = String(customerEmail || '').trim()
  if (email) return email
  const digits = String(customerPhone || '').replace(/\D+/g, '')
  return digits || null
}

function buildTrackingUrl(trackingNumber?: string | null): string | null {
  const value = String(trackingNumber || '').trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://sporing.posten.no/sporing/${encodeURIComponent(value)}`
}

function toFormState(order: EggOrder, defaultCountry: string): EggOrderFormState {
  return {
    customerName: order.customer_name || '',
    customerEmail: order.customer_email || '',
    customerPhone: order.customer_phone || '',
    shippingName: order.shipping_name || '',
    shippingEmail: order.shipping_email || '',
    shippingPhone: order.shipping_phone || '',
    shippingAddress: order.shipping_address || '',
    shippingPostalCode: order.shipping_postal_code || '',
    shippingCity: order.shipping_city || '',
    shippingCountry: order.shipping_country || defaultCountry,
    quantity: String(order.quantity || 0),
    pricePerEgg: String(order.price_per_egg || 0),
    deliveryMethod: order.delivery_method || 'posten',
    deliveryFee: String(order.delivery_fee || 0),
    depositAmount: String(order.deposit_amount || 0),
    remainderAmount: String(order.remainder_amount || 0),
    status: order.status || 'pending',
    notes: order.notes || '',
    adminNotes: order.admin_notes || '',
    appendAdminNote: '',
    lockOrder: Boolean(order.locked_at),
  }
}

export function EggOrdersWorkbench({
  initialOrderId = null,
  onInitialOrderHandled,
  onNavigateToCustomer,
}: EggOrdersWorkbenchProps = {}) {
  const { toast } = useToast()
  const { t } = useLanguage()
  const copy = t.eggOrdersWorkbench
  const customerCopy = t.customerDatabase
  const [orders, setOrders] = useState<EggOrder[]>([])
  const [summary, setSummary] = useState<EggOrdersSummary>(EMPTY_SUMMARY)
  const [availableWeeks, setAvailableWeeks] = useState<WeekOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentState>('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [weekFilter, setWeekFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [atRiskOnly, setAtRiskOnly] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('deposit_paid')
  const [bulkDeliveryMethod, setBulkDeliveryMethod] = useState('posten')
  const [bulkDeliveryFee, setBulkDeliveryFee] = useState('30000')
  const [bulkNote, setBulkNote] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<EggOrder | null>(null)
  const [form, setForm] = useState<EggOrderFormState | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [moveWeek, setMoveWeek] = useState('')
  const [moveYear, setMoveYear] = useState('')
  const [manualStatus, setManualStatus] = useState('deposit_paid')
  const [deliveryActionMethod, setDeliveryActionMethod] = useState('posten')
  const [deliveryActionFee, setDeliveryActionFee] = useState('30000')

  const [trackingModalOpen, setTrackingModalOpen] = useState(false)
  const [trackingModalOrderId, setTrackingModalOrderId] = useState<string | null>(null)
  const [trackingNumberInput, setTrackingNumberInput] = useState('')
  const [markShippedLoading, setMarkShippedLoading] = useState(false)
  const [initialOrderHandled, setInitialOrderHandled] = useState(false)

  // View mode: table | cards | pipeline | monitor
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'pipeline' | 'monitor'>('table')

  // Confirm dialog for destructive actions
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: string
    title: string
    description: string
  }>({ open: false, action: '', title: '', description: '' })

  // Remainder monitor: per-row sending state
  const [monitorSending, setMonitorSending] = useState<Set<string>>(new Set())
  const [monitorSent, setMonitorSent] = useState<Set<string>>(new Set())

  // Panel: show advanced (destructive) actions
  const [showAdvancedActions, setShowAdvancedActions] = useState(false)

  const statusOptions = useMemo(
    () =>
      STATUS_OPTIONS.map((value) => ({
        value,
        label: copy.statusOptions[value],
      })),
    [copy]
  )

  const paymentOptions = useMemo(
    () =>
      PAYMENT_OPTIONS.map((value) => ({
        value,
        label: copy.paymentOptions[value],
      })),
    [copy]
  )

  const deliveryOptions = useMemo(
    () =>
      DELIVERY_OPTIONS.map((value) => ({
        value,
        label: copy.deliveryOptions[value],
      })),
    [copy]
  )

  const sortOptions = useMemo(
    () =>
      SORT_OPTIONS.map((value) => ({
        value,
        label: copy.sortOptions[value],
      })),
    [copy]
  )

  function replaceTokens(template: string, tokens: Record<string, string | number>): string {
    return Object.entries(tokens).reduce((text, [token, tokenValue]) => {
      return text.replace(new RegExp(`\\{${token}\\}`, 'g'), String(tokenValue))
    }, template)
  }

  function formatOre(value: number | null | undefined): string {
    const safe = Number(value || 0)
    return `${copy.currencyPrefix} ${(safe / 100).toLocaleString(copy.locale)}`
  }

  function formatDate(value: string | null | undefined): string {
    if (!value) return copy.emptyDate
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return copy.emptyDate
    return date.toLocaleDateString(copy.locale)
  }

  function getDeliveryLabel(method: string): string {
    if (method === 'posten') return copy.deliveryOptions.posten
    if (method === 'e6_pickup') return copy.deliveryOptions.e6_pickup
    if (method === 'farm_pickup') return copy.deliveryOptions.farm_pickup
    return method
  }

  function getStatusLabel(status: string): string {
    return statusOptions.find((option) => option.value === status)?.label || status
  }

  function getPaymentStateLabel(state: PaymentState): string {
    return copy.paymentOptions[state]
  }

  function getPaymentStatusLabel(status: string): string {
    const labels = copy.paymentStatusLabels as Record<string, string>
    return labels[status] || status
  }

  function getUnifiedStatePill(order: EggOrder): { label: string; className: string } {
    const us = (copy as any).unifiedState as Record<string, string>
    const status = order.status
    if (status === 'cancelled') return { label: us.cancelled, className: 'bg-neutral-100 text-neutral-600' }
    if (status === 'forfeited') return { label: us.forfeited, className: 'bg-neutral-200 text-neutral-600' }
    if (status === 'delivered') return { label: us.delivered, className: 'bg-emerald-100 text-emerald-800' }
    if (status === 'shipped') return { label: us.shipped, className: 'bg-blue-100 text-blue-800' }

    const paymentState = getPaymentState(order)
    if (paymentState === 'deposit_pending') return { label: us.depositPending, className: 'bg-orange-100 text-orange-800' }
    if (paymentState === 'refunded') return { label: us.refunded, className: 'bg-slate-200 text-slate-700' }
    if (paymentState === 'failed') return { label: us.failed, className: 'bg-red-100 text-red-800' }

    if (paymentState === 'remainder_due') {
      if (order.remainder_due_date) {
        const days = daysUntilDate(order.remainder_due_date)
        if (days < 0) return { label: us.remainderOverdue, className: 'bg-red-100 text-red-800' }
        const label = (us.remainderDueDays || 'Restbeløp - {days}d').replace('{days}', String(days))
        return { label, className: days <= 3 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800' }
      }
      return { label: us.remainderDue, className: 'bg-amber-100 text-amber-800' }
    }

    if (status === 'preparing') return { label: us.preparing, className: 'bg-violet-100 text-violet-800' }
    if (status === 'fully_paid') return { label: us.fullyPaid, className: 'bg-emerald-100 text-emerald-800' }
    if (status === 'deposit_paid') return { label: us.depositPaid, className: 'bg-sky-100 text-sky-800' }
    return { label: getStatusLabel(status), className: 'bg-neutral-100 text-neutral-800' }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  async function handleMarkAsSent(order: EggOrder) {
    if (order.tracking_number) {
      setMarkShippedLoading(true)
      try {
        const response = await fetch(`/api/admin/eggs/orders/${order.id}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_shipped', data: { trackingNumber: order.tracking_number } }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result?.error || copy.errors.orderActionFailed)
        toast({ title: copy.toast.updatedTitle, description: copy.markSent.successToast })
        await fetchOrders(true)
      } catch (err: any) {
        toast({ title: copy.toast.errorTitle, description: err?.message || copy.errors.orderActionFailed, variant: 'destructive' })
      } finally {
        setMarkShippedLoading(false)
      }
      return
    }
    setTrackingModalOrderId(order.id)
    setTrackingNumberInput('')
    setTrackingModalOpen(true)
  }

  async function submitTrackingNumber() {
    if (!trackingModalOrderId) return
    const trimmed = trackingNumberInput.trim()
    // Accept: Posten tracking URL, ND-prefixed code, or numeric tracking number (10+ digits)
    const isValid =
      /^https?:\/\/(sporing|tracking)\.posten\.no\b/i.test(trimmed) ||
      /^(ND|NO)\d+$/i.test(trimmed) ||
      /^\d{10,}$/.test(trimmed)
    if (!isValid) {
      toast({ title: copy.toast.errorTitle, description: copy.markSent.invalidFormat, variant: 'destructive' })
      return
    }
    setMarkShippedLoading(true)
    try {
      const response = await fetch(`/api/admin/eggs/orders/${trackingModalOrderId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_shipped', data: { trackingNumber: trimmed } }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || copy.errors.orderActionFailed)
      toast({ title: copy.toast.updatedTitle, description: copy.markSent.successToast })
      setTrackingModalOpen(false)
      setTrackingModalOrderId(null)
      setTrackingNumberInput('')
      await fetchOrders(true)
    } catch (err: any) {
      toast({ title: copy.toast.errorTitle, description: err?.message || copy.errors.orderActionFailed, variant: 'destructive' })
    } finally {
      setMarkShippedLoading(false)
    }
  }

  const fetchOrders = useCallback(
    async (isBackgroundRefresh = false) => {
      if (isBackgroundRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setErrorText(null)

      try {
        const params = new URLSearchParams()
        if (searchTerm) params.set('search', searchTerm)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (paymentFilter !== 'all') params.set('payment', paymentFilter)
        if (deliveryFilter !== 'all') params.set('delivery', deliveryFilter)
        if (weekFilter !== 'all') params.set('week', weekFilter)
        if (atRiskOnly) params.set('atRisk', 'true')
        if (sortBy !== 'newest') params.set('sort', sortBy)

        const response = await fetch(`/api/admin/eggs/orders?${params.toString()}`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || copy.errors.loadOrders)
        }

        setOrders(Array.isArray(data.orders) ? data.orders : [])
        setSummary(data.summary || EMPTY_SUMMARY)
        setAvailableWeeks(Array.isArray(data.availableWeeks) ? data.availableWeeks : [])
      } catch (error: any) {
        setErrorText(error?.message || copy.errors.loadOrders)
      } finally {
        if (isBackgroundRefresh) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [searchTerm, statusFilter, paymentFilter, deliveryFilter, weekFilter, atRiskOnly, sortBy, copy.errors.loadOrders]
  )

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    setInitialOrderHandled(false)
  }, [initialOrderId])

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>()
      for (const id of Array.from(prev)) {
        if (orders.some((order) => order.id === id)) {
          next.add(id)
        }
      }
      return next
    })
  }, [orders])

  const selectedCount = selectedIds.size
  const allSelected = useMemo(() => orders.length > 0 && selectedCount === orders.length, [orders.length, selectedCount])

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(orders.map((order) => order.id)))
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function fetchOrderDetail(orderId: string) {
    setPanelLoading(true)
    setPanelOpen(true)
    try {
      const response = await fetch(`/api/admin/eggs/orders/${orderId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || copy.errors.fetchOrderDetails)
      }
      const order = data as EggOrder
      setSelectedOrder(order)
      setForm(toFormState(order, copy.defaultShippingCountry))
      setMoveWeek(String(order.week_number || ''))
      setMoveYear(String(order.year || ''))
      setManualStatus(order.status || 'deposit_paid')
      setDeliveryActionMethod(order.delivery_method || 'posten')
      setDeliveryActionFee(String(order.delivery_fee || 0))
      setActionReason('')
    } catch (error: any) {
      toast({
        title: copy.toast.errorTitle,
        description: error?.message || copy.errors.fetchOrderDetails,
        variant: 'destructive',
      })
      setPanelOpen(false)
      setSelectedOrder(null)
      setForm(null)
    } finally {
      setPanelLoading(false)
    }
  }

  useEffect(() => {
    if (!initialOrderId || initialOrderHandled || loading) return
    setInitialOrderHandled(true)
    void fetchOrderDetail(initialOrderId).finally(() => {
      onInitialOrderHandled?.()
    })
  }, [initialOrderHandled, initialOrderId, loading, onInitialOrderHandled])

  async function refreshSelectedOrder() {
    if (!selectedOrder) return
    await fetchOrderDetail(selectedOrder.id)
  }

  async function saveOrderEdits() {
    if (!selectedOrder || !form) return
    setSaveLoading(true)

    try {
      const payload: Record<string, unknown> = {
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        shippingName: form.shippingName,
        shippingEmail: form.shippingEmail,
        shippingPhone: form.shippingPhone,
        shippingAddress: form.shippingAddress,
        shippingPostalCode: form.shippingPostalCode,
        shippingCity: form.shippingCity,
        shippingCountry: form.shippingCountry,
        quantity: Number(form.quantity || 0),
        pricePerEgg: Number(form.pricePerEgg || 0),
        deliveryMethod: form.deliveryMethod,
        deliveryFee: Number(form.deliveryFee || 0),
        depositAmount: Number(form.depositAmount || 0),
        remainderAmount: Number(form.remainderAmount || 0),
        status: form.status,
        notes: form.notes,
        adminNotes: form.adminNotes,
        lockOrder: form.lockOrder,
      }

      if (form.appendAdminNote.trim()) {
        payload.appendAdminNote = form.appendAdminNote.trim()
      }

      const response = await fetch(`/api/admin/eggs/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || copy.errors.saveOrder)
      }

      const nextOrder = (data?.order || data) as EggOrder
      setSelectedOrder(nextOrder)
      setForm(toFormState(nextOrder, copy.defaultShippingCountry))

      toast({
        title: copy.toast.savedTitle,
        description: copy.toast.savedDescription,
      })

      await fetchOrders(true)
    } catch (error: any) {
      toast({
        title: copy.toast.errorTitle,
        description: error?.message || copy.errors.saveOrder,
        variant: 'destructive',
      })
    } finally {
      setSaveLoading(false)
    }
  }

  async function runOrderAction(action: string, data: Record<string, unknown> = {}) {
    if (!selectedOrder) return
    setActionLoading(action)
    try {
      const response = await fetch(`/api/admin/eggs/orders/${selectedOrder.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || copy.errors.orderActionFailed)
      }

      toast({
        title: copy.toast.updatedTitle,
        description: copy.toast.actionCompleted,
      })

      await Promise.all([refreshSelectedOrder(), fetchOrders(true)])
    } catch (error: any) {
      toast({
        title: copy.toast.errorTitle,
        description: error?.message || copy.errors.orderActionFailed,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  async function runBulkAction(action: string, data: Record<string, unknown>) {
    if (!selectedIds.size) return
    setBulkLoading(true)
    try {
      const response = await fetch('/api/admin/eggs/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, orderIds: Array.from(selectedIds), data }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || copy.errors.bulkActionFailed)
      }

      const failures = Array.isArray(result?.failures) ? result.failures : []
      if (failures.length > 0) {
        toast({
          title: copy.toast.partialTitle,
          description: replaceTokens(copy.toast.partialDescription, {
            affected: result?.affected || 0,
            failed: failures.length,
          }),
          variant: 'destructive',
        })
      } else {
        toast({
          title: copy.toast.updatedTitle,
          description: replaceTokens(copy.toast.bulkUpdatedDescription, {
            affected: result?.affected || selectedIds.size,
          }),
        })
      }

      setSelectedIds(new Set())
      await fetchOrders(true)
    } catch (error: any) {
      toast({
        title: copy.toast.errorTitle,
        description: error?.message || copy.errors.bulkActionFailed,
        variant: 'destructive',
      })
    } finally {
      setBulkLoading(false)
    }
  }

  async function sendMonitorReminder(orderId: string) {
    setMonitorSending((prev) => new Set([...Array.from(prev), orderId]))
    try {
      const response = await fetch(`/api/admin/eggs/orders/${orderId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_remainder_reminder', data: {} }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || copy.errors.orderActionFailed)
      setMonitorSent((prev) => new Set([...Array.from(prev), orderId]))
    } catch (err: any) {
      toast({ title: copy.toast.errorTitle, description: err?.message || copy.errors.orderActionFailed, variant: 'destructive' })
    } finally {
      setMonitorSending((prev) => {
        const next = new Set(Array.from(prev)); next.delete(orderId); return next
      })
    }
  }

  function openConfirmDialog(action: string, title: string, description: string) {
    setConfirmDialog({ open: true, action, title, description })
  }

  async function handleConfirmedAction() {
    const { action } = confirmDialog
    setConfirmDialog((prev) => ({ ...prev, open: false }))
    if (action === 'cancel_order') {
      await runOrderAction('cancel_order', { releaseInventory: true, reason: actionReason || undefined })
    } else if (action === 'cancel_and_refund') {
      await runOrderAction('cancel_and_refund', { releaseInventory: true, reason: actionReason || undefined })
    } else if (action === 'refund_deposit') {
      await runOrderAction('refund_deposit', { reason: actionReason || undefined })
    }
  }

  async function exportCsv() {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (paymentFilter !== 'all') params.set('payment', paymentFilter)
      if (deliveryFilter !== 'all') params.set('delivery', deliveryFilter)
      if (weekFilter !== 'all') params.set('week', weekFilter)
      if (atRiskOnly) params.set('atRisk', 'true')
      if (sortBy !== 'newest') params.set('sort', sortBy)
      params.set('format', 'csv')

      const response = await fetch(`/api/admin/eggs/orders?${params.toString()}`)
      if (!response.ok) {
        throw new Error(copy.errors.exportCsv)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${copy.exportFilenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: copy.toast.errorTitle,
        description: error?.message || copy.errors.exportCsv,
        variant: 'destructive',
      })
    }
  }

  const revenue = useMemo(() => formatOre(summary.revenueOre), [summary.revenueOre])
  const outstanding = useMemo(() => formatOre(summary.outstandingOre), [summary.outstandingOre])
  const selectedQuantities = useMemo(
    () => (selectedOrder ? getEggQuantities(selectedOrder) : null),
    [selectedOrder]
  )
  const selectedPaymentState = useMemo(
    () => (selectedOrder ? getPaymentState(selectedOrder) : null),
    [selectedOrder]
  )
  const selectedOrderAtRisk = useMemo(
    () => (selectedOrder ? isAtRiskOrder(selectedOrder) : false),
    [selectedOrder]
  )
  const selectedShippingMissing = useMemo(
    () => (selectedOrder ? hasMissingShipping(selectedOrder) : false),
    [selectedOrder]
  )

  function navigateToCustomerProfile(customerEmail?: string | null, customerPhone?: string | null) {
    const lookup = resolveCustomerLookup(customerEmail, customerPhone)
    if (!lookup) {
      toast({
        title: copy.toast.errorTitle,
        description: copy.errors.openCustomerProfile,
        variant: 'destructive',
      })
      return
    }

    if (onNavigateToCustomer) {
      onNavigateToCustomer(lookup)
      return
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      params.set('tab', 'customers')
      params.set('subTab', 'database')
      params.set('customerId', lookup)
      window.location.href = `/admin?${params.toString()}`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-neutral-900">{copy.title}</h2>
          <p className="text-sm text-neutral-600 mt-1">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggles */}
          <div className="flex rounded-md border border-neutral-200 overflow-hidden">
            {([
              { mode: 'table', icon: <List className="w-4 h-4" />, label: (copy as any).viewModes?.table ?? 'Tabell' },
              { mode: 'cards', icon: <LayoutGrid className="w-4 h-4" />, label: (copy as any).viewModes?.cards ?? 'Kort' },
              { mode: 'pipeline', icon: <KanbanSquare className="w-4 h-4" />, label: (copy as any).viewModes?.pipeline ?? 'Pipeline' },
              { mode: 'monitor', icon: <Timer className="w-4 h-4" />, label: (copy as any).viewModes?.monitor ?? 'Restbetaling' },
            ] as const).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm transition-colors',
                  viewMode === mode
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50'
                )}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {copy.refreshButton}
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="w-4 h-4" />
            {copy.exportCsvButton}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{copy.stats.orders}</p>
          <p className="text-2xl font-semibold text-neutral-900">{summary.filteredOrders}</p>
          <p className="text-xs text-neutral-500">
            {replaceTokens(copy.stats.ofTotal, { count: summary.totalOrders })}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{copy.stats.missingDeposit}</p>
          <p className="text-2xl font-semibold text-orange-700">{summary.pendingDeposit}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{copy.stats.remainderDue}</p>
          <p className="text-2xl font-semibold text-amber-700">{summary.remainderDue}</p>
          <p className="text-xs text-neutral-500">{outstanding}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{copy.stats.fullyPaid}</p>
          <p className="text-2xl font-semibold text-emerald-700">{summary.fullyPaid}</p>
          <p className="text-xs text-neutral-500">{revenue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{copy.stats.needsAttention}</p>
          <div className="flex items-center gap-2 text-red-700 font-semibold text-xl">
            <ShieldAlert className="w-5 h-5" />
            {summary.atRisk}
          </div>
          <p className="text-xs text-neutral-500">
            {replaceTokens(copy.stats.shippingMissing, { count: summary.shippingMissing })}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          <div className="xl:col-span-2">
            <Label className="text-xs text-neutral-500">{copy.filters.searchLabel}</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={copy.filters.searchPlaceholder}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">{copy.filters.statusLabel}</Label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              <option value="all">{copy.filters.allStatuses}</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">{copy.filters.paymentLabel}</Label>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as 'all' | PaymentState)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">{copy.filters.deliveryLabel}</Label>
            <select
              value={deliveryFilter}
              onChange={(event) => setDeliveryFilter(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              {deliveryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">{copy.filters.weekLabel}</Label>
            <select
              value={weekFilter}
              onChange={(event) => setWeekFilter(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              <option value="all">{copy.filters.allWeeks}</option>
              {availableWeeks.map((week) => (
                <option key={week.value} value={week.value}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">{copy.filters.sortLabel}</Label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={atRiskOnly}
              onChange={(event) => setAtRiskOnly(event.target.checked)}
              className="rounded border-neutral-300"
            />
            {copy.filters.atRiskOnly}
          </label>
          {(summary.failedPayments > 0 || summary.shippingMissing > 0) && (
            <div className="text-xs text-neutral-600 flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                {replaceTokens(copy.filters.failedPayments, { count: summary.failedPayments })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-500" />
                {replaceTokens(copy.filters.missingShippingData, { count: summary.shippingMissing })}
              </span>
            </div>
          )}
        </div>
      </Card>

      {selectedCount > 0 && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-900">
              {replaceTokens(copy.bulk.selectedCount, { count: selectedCount })}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="flex gap-2">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  className="h-10 flex-1 rounded-md border border-blue-200 px-3 text-sm bg-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  disabled={bulkLoading}
                  onClick={() => runBulkAction('set_status', { status: bulkStatus })}
                >
                  {copy.bulk.setStatusButton}
                </Button>
              </div>
              <div className="flex gap-2">
                <select
                  value={bulkDeliveryMethod}
                  onChange={(event) => {
                    const method = event.target.value
                    setBulkDeliveryMethod(method)
                    setBulkDeliveryFee(String(getDefaultDeliveryFee(method)))
                  }}
                  className="h-10 flex-1 rounded-md border border-blue-200 px-3 text-sm bg-white"
                >
                  {deliveryOptions
                    .filter((option) => option.value !== 'all')
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
                <Input
                  value={bulkDeliveryFee}
                  onChange={(event) => setBulkDeliveryFee(event.target.value)}
                  className="h-10 w-28"
                />
                <Button
                  variant="outline"
                  disabled={bulkLoading}
                  onClick={() =>
                    runBulkAction('set_delivery', {
                      deliveryMethod: bulkDeliveryMethod,
                      deliveryFee: Number(bulkDeliveryFee || 0),
                    })
                  }
                >
                  {copy.bulk.deliveryButton}
                </Button>
              </div>
              <div className="flex gap-2 lg:col-span-2">
                <Input
                  value={bulkNote}
                  onChange={(event) => setBulkNote(event.target.value)}
                  placeholder={copy.bulk.notePlaceholder}
                />
                <Button
                  variant="outline"
                  disabled={bulkLoading || !bulkNote.trim()}
                  onClick={() => {
                    runBulkAction('append_admin_note', { note: bulkNote.trim() })
                    setBulkNote('')
                  }}
                >
                  {copy.bulk.noteButton}
                </Button>
                <Button variant="outline" disabled={bulkLoading} onClick={() => runBulkAction('lock_orders', {})}>
                  {copy.bulk.lockButton}
                </Button>
                <Button variant="outline" disabled={bulkLoading} onClick={() => runBulkAction('unlock_orders', {})}>
                  {copy.bulk.unlockButton}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Week checklist (#2) ── shown when a week is selected */}
      {weekFilter !== 'all' && !loading && viewMode !== 'monitor' && (() => {
        const wc = (copy as any).weekChecklist as Record<string, string>
        const weekOrders = orders
        const totalCount = weekOrders.length
        const missingCount = weekOrders.filter(hasMissingShipping).length
        const remainderCount = weekOrders.filter((o) => getPaymentState(o) === 'remainder_due' && (!o.remainder_due_date || daysUntilDate(o.remainder_due_date) >= 0)).length
        const overdueCount = weekOrders.filter((o) => {
          const ps = getPaymentState(o)
          return ps === 'remainder_due' && o.remainder_due_date && daysUntilDate(o.remainder_due_date) < 0
        }).length
        const selectedWeek = availableWeeks.find((w) => w.value === weekFilter)
        const weekLabel = selectedWeek ? `${selectedWeek.week}/${selectedWeek.year}` : weekFilter
        const allGood = missingCount === 0 && remainderCount === 0 && overdueCount === 0 && totalCount > 0
        return (
          <Card className={cn('p-4 border', allGood ? 'border-emerald-200 bg-emerald-50' : overdueCount > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50')}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900">
                  {(wc.title || 'Ukessjekkliste — Uke {week}/{year}').replace('{week}/{year}', weekLabel)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-neutral-700">
                  {(wc.totalOrders || '{count} ordre').replace('{count}', String(totalCount))}
                </span>
                {missingCount > 0 && (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    {(wc.missingShipping || '{count} mangler fraktadresse').replace('{count}', String(missingCount))}
                  </span>
                )}
                {remainderCount > 0 && (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <CircleDollarSign className="w-3.5 h-3.5" />
                    {(wc.outstandingRemainder || '{count} med ubetalt restbeløp').replace('{count}', String(remainderCount))}
                  </span>
                )}
                {overdueCount > 0 && (
                  <span className="text-red-700 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {(wc.overdueRemainder || '{count} med forfalt restbeløp').replace('{count}', String(overdueCount))}
                  </span>
                )}
                {allGood && (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {wc.allGood || 'Alt klart for forsendelse!'}
                  </span>
                )}
                {totalCount === 0 && (
                  <span className="text-neutral-500">{wc.noOrdersThisWeek || 'Ingen ordre for valgt uke.'}</span>
                )}
              </div>
            </div>
          </Card>
        )
      })()}

      {/* ── Remainder monitor view (#10) ── */}
      {viewMode === 'monitor' && (() => {
        const mc = (copy as any).monitor as Record<string, string>
        const today = new Date(new Date().toISOString().split('T')[0])
        const cutoffDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
        const monitorOrders = orders
          .filter((o) => {
            const ps = getPaymentState(o)
            if (ps !== 'remainder_due') return false
            if (!o.remainder_due_date) return true
            const due = new Date(o.remainder_due_date)
            return due <= cutoffDate
          })
          .sort((a, b) => {
            const da = a.remainder_due_date ? new Date(a.remainder_due_date).getTime() : 0
            const db = b.remainder_due_date ? new Date(b.remainder_due_date).getTime() : 0
            return da - db
          })
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-neutral-900">{mc.title}</h3>
              <p className="text-sm text-neutral-600">{mc.subtitle}</p>
            </div>
            {monitorOrders.length === 0 ? (
              <Card className="p-8 text-center text-neutral-600">{mc.empty}</Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600">{mc.columnCustomer}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600">{mc.columnOrder}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600">{mc.columnBreed}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600">{mc.columnAmount}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600">{mc.columnDue}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600">{mc.columnDays}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-neutral-600">{mc.columnAction}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {monitorOrders.map((order) => {
                        const days = order.remainder_due_date ? daysUntilDate(order.remainder_due_date) : null
                        const dueOre = Math.max(0, (order.remainder_amount || 0) - (order.egg_payments || []).filter((p) => p.payment_type === 'remainder' && p.status === 'completed').reduce((sum, p) => sum + Math.round((p.amount_nok || 0) * 100), 0))
                        const isSending = monitorSending.has(order.id)
                        const isSent = monitorSent.has(order.id)
                        const daysClass = days === null ? 'text-neutral-500' : days < 0 ? 'text-red-700 font-bold' : days === 0 ? 'text-red-700 font-semibold' : days <= 3 ? 'text-red-600 font-medium' : 'text-amber-600'
                        const daysLabel = days === null ? '-' : days < 0 ? mc.overdue : days === 0 ? mc.today : days === 1 ? mc.tomorrow : (mc.daysRemaining || '{days} dager').replace('{days}', String(days))
                        return (
                          <tr key={order.id} className="hover:bg-neutral-50/60 transition-colors">
                            <td className="px-4 py-3 text-sm">
                              <button className="font-medium text-neutral-900 hover:underline text-left" onClick={() => fetchOrderDetail(order.id)}>
                                {order.customer_name}
                              </button>
                              <p className="text-xs text-neutral-500">{order.customer_email}</p>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button className="font-semibold text-blue-700 hover:text-blue-900" onClick={() => fetchOrderDetail(order.id)}>
                                {order.order_number}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-700">
                              <p>{order.egg_breeds?.name || copy.fallbackBreedShort}</p>
                              <p className="text-xs text-neutral-500">{replaceTokens(copy.table.weekValue, { week: order.week_number, year: order.year })}</p>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-neutral-900">{formatOre(dueOre)}</td>
                            <td className="px-4 py-3 text-sm text-neutral-600">{order.remainder_due_date ? formatDate(order.remainder_due_date) : copy.emptyDate}</td>
                            <td className={cn('px-4 py-3 text-sm', daysClass)}>{daysLabel}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant={isSent ? 'outline' : 'default'}
                                disabled={isSending || isSent}
                                onClick={() => sendMonitorReminder(order.id)}
                              >
                                {isSending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                                {isSent ? mc.reminderSent : mc.sendReminder}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )
      })()}

      {/* ── Mobile card view (#7) ── */}
      {viewMode === 'cards' && !loading && !errorText && (
        orders.length === 0 ? (
          <Card className="p-8 text-center text-neutral-600">{copy.states.empty}</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map((order) => {
              const pill = getUnifiedStatePill(order)
              const eggQ = getEggQuantities(order)
              const canShip = order.delivery_method === 'posten' && ['fully_paid', 'preparing'].includes(order.status)
              return (
                <Card key={order.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button className="font-bold text-blue-700 text-lg leading-tight" onClick={() => fetchOrderDetail(order.id)}>
                        {order.order_number}
                      </button>
                      <p className="text-sm text-neutral-700 font-medium mt-0.5">{order.customer_name}</p>
                    </div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0', pill.className)}>
                      {pill.label}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-600 space-y-1">
                    <p>{order.egg_breeds?.name || copy.fallbackBreedShort} · {eggQ.total} egg</p>
                    <p>{replaceTokens(copy.table.weekValue, { week: order.week_number, year: order.year })} · {getDeliveryLabel(order.delivery_method)}</p>
                    <p className="font-medium text-neutral-900">{formatOre(order.total_amount)}</p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {canShip && (
                      <Button size="sm" variant="default" className="flex-1" disabled={markShippedLoading} onClick={() => handleMarkAsSent(order)}>
                        <Package className="w-4 h-4 mr-1" />
                        {(copy as any).mobileCards?.shipButton ?? copy.markSent.button}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => fetchOrderDetail(order.id)}>
                      <Settings className="w-4 h-4 mr-1" />
                      {(copy as any).mobileCards?.manageButton ?? copy.table.manageButton}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* ── Pipeline / kanban view (#1) ── */}
      {viewMode === 'pipeline' && !loading && !errorText && (() => {
        const pc = (copy as any).pipeline as Record<string, any>
        if (weekFilter === 'all') {
          return (
            <Card className="p-8 text-center text-neutral-600">
              <KanbanSquare className="w-8 h-8 mx-auto mb-3 text-neutral-400" />
              <p>{pc.noWeekSelected || 'Velg en uke i filteret for å se pipeline-visning.'}</p>
            </Card>
          )
        }
        const PIPELINE_COLS: Array<{ key: string; label: string; color: string }> = [
          { key: 'pending', label: pc.columns?.pending ?? 'Venter forskudd', color: 'border-orange-200 bg-orange-50' },
          { key: 'deposit_paid', label: pc.columns?.deposit_paid ?? 'Forskudd betalt', color: 'border-sky-200 bg-sky-50' },
          { key: 'fully_paid', label: pc.columns?.fully_paid ?? 'Fullt betalt', color: 'border-emerald-200 bg-emerald-50' },
          { key: 'preparing', label: pc.columns?.preparing ?? 'Forberedes', color: 'border-violet-200 bg-violet-50' },
          { key: 'shipped', label: pc.columns?.shipped ?? 'Sendt', color: 'border-blue-200 bg-blue-50' },
          { key: 'delivered', label: pc.columns?.delivered ?? 'Levert', color: 'border-neutral-200 bg-neutral-50' },
        ]
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {PIPELINE_COLS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col.key)
              return (
                <div key={col.key} className={cn('rounded-xl border p-3 space-y-2 min-h-[120px]', col.color)}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">{col.label}</p>
                    <span className="text-xs font-bold text-neutral-900 bg-white rounded-full px-1.5 py-0.5 border border-neutral-200">{colOrders.length}</span>
                  </div>
                  {colOrders.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-2">—</p>
                  ) : colOrders.map((order) => {
                    const eggQ = getEggQuantities(order)
                    const canShip = order.delivery_method === 'posten' && ['fully_paid', 'preparing'].includes(order.status)
                    return (
                      <div key={order.id} className="bg-white rounded-lg border border-white/80 p-2.5 shadow-sm space-y-1">
                        <button className="font-semibold text-blue-700 text-sm leading-tight text-left w-full hover:underline" onClick={() => fetchOrderDetail(order.id)}>
                          {order.order_number}
                        </button>
                        <p className="text-xs text-neutral-700 truncate">{order.customer_name}</p>
                        <p className="text-xs text-neutral-500">{order.egg_breeds?.name || copy.fallbackBreedShort} · {eggQ.total}</p>
                        <p className="text-xs text-neutral-500">{getDeliveryLabel(order.delivery_method)}</p>
                        {canShip && (
                          <Button size="sm" className="w-full h-7 text-xs mt-1" disabled={markShippedLoading} onClick={() => handleMarkAsSent(order)}>
                            <Package className="w-3 h-3 mr-1" />
                            {(copy as any).mobileCards?.shipButton ?? 'Send'}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── Table view (default) ── */}
      {viewMode === 'table' && (
        loading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
          </Card>
        ) : errorText ? (
          <Card className="p-8 text-center">
            <p className="text-red-600 font-medium">{copy.states.loadErrorTitle}</p>
            <p className="text-sm text-neutral-600 mt-2">{errorText}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchOrders()}>
              {copy.states.retryButton}
            </Button>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="p-8 text-center text-neutral-600">{copy.states.empty}</Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-neutral-300"
                      />
                    </th>
                    <SortableHeader label={copy.table.order} sortKey="newest" currentSort={sortBy} onSort={setSortBy} ascKey="oldest" descKey="newest" />
                    <SortableHeader label={copy.table.customer} sortKey="customer" currentSort={sortBy} onSort={setSortBy} ascKey="customer_asc" descKey="customer_desc" />
                    <SortableHeader label={copy.table.delivery} sortKey="delivery" currentSort={sortBy} onSort={setSortBy} ascKey="delivery_asc" descKey="delivery_desc" />
                    <SortableHeader label={copy.table.status} sortKey="status" currentSort={sortBy} onSort={setSortBy} ascKey="status_asc" descKey="status_desc" />
                    <SortableHeader label={copy.table.amount} sortKey="amount" currentSort={sortBy} onSort={setSortBy} ascKey="amount_asc" descKey="amount_desc" />
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right text-xs sm:text-sm font-medium text-neutral-700">{copy.table.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orders.map((order) => {
                    const orderAtRisk = isAtRiskOrder(order)
                    const shippingMissing = hasMissingShipping(order)
                    const eggQuantities = getEggQuantities(order)
                    const unifiedPill = getUnifiedStatePill(order)

                    return (
                      <tr key={order.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            className="rounded border-neutral-300"
                          />
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          <div>
                            <button
                              className="font-semibold text-xs sm:text-sm text-blue-700 hover:text-blue-900"
                              onClick={() => fetchOrderDetail(order.id)}
                            >
                              {order.order_number}
                            </button>
                            <p className="text-xs text-neutral-500 mt-1">
                              {replaceTokens(copy.table.breedEggsValue, {
                                breed: order.egg_breeds?.name || copy.fallbackBreed,
                                quantity: eggQuantities.total,
                              })}
                            </p>
                            {eggQuantities.additions > 0 && (
                              <p className="text-xs text-neutral-500">
                                {replaceTokens(copy.table.quantityBreakdownValue || '{base} + {additions} = {total}', {
                                  base: eggQuantities.base,
                                  additions: eggQuantities.additions,
                                  total: eggQuantities.total,
                                })}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => navigateToCustomerProfile(order.customer_email, order.customer_phone)}
                              className="font-medium text-left text-neutral-900 underline-offset-4 transition hover:text-neutral-700 hover:underline"
                            >
                              {order.customer_name}
                            </button>
                            <a
                              href={`mailto:${order.customer_email}`}
                              className="hidden sm:block text-neutral-600 underline-offset-4 hover:text-neutral-800 hover:underline"
                            >
                              {order.customer_email}
                            </a>
                            {order.customer_phone && <p className="hidden sm:block text-neutral-500">{order.customer_phone}</p>}
                          </div>
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                          <p className="text-neutral-900">
                            {replaceTokens(copy.table.weekValue, {
                              week: order.week_number,
                              year: order.year,
                            })}
                          </p>
                          <p className="text-neutral-600">{getDeliveryLabel(order.delivery_method)}</p>
                          <p className="text-neutral-500">{formatDate(order.delivery_monday)}</p>
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', unifiedPill.className)}>
                            {unifiedPill.label}
                          </span>
                          {(orderAtRisk || shippingMissing || order.locked_at) && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {orderAtRisk && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  {copy.table.riskBadge}
                                </span>
                              )}
                              {shippingMissing && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800">
                                  <Truck className="w-3 h-3" />
                                  {copy.table.shippingBadge}
                                </span>
                              )}
                              {order.locked_at && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-neutral-200 text-neutral-600">
                                  {copy.table.locked}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                          <p className="font-semibold text-neutral-900">{formatOre(order.total_amount)}</p>
                          <p className="text-neutral-600">
                            {replaceTokens(copy.table.depositValue, { amount: formatOre(order.deposit_amount) })}
                          </p>
                          <p className="text-neutral-500">
                            {replaceTokens(copy.table.remainderValue, { amount: formatOre(Math.max(0, (order.remainder_amount || 0) - (order.egg_payments || []).filter(p => p.payment_type === 'remainder' && p.status === 'completed').reduce((sum, p) => sum + Math.round((p.amount_nok || 0) * 100), 0))) })}
                          </p>
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            {order.delivery_method === 'posten' &&
                              ['fully_paid', 'preparing'].includes(order.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={markShippedLoading}
                                  onClick={() => handleMarkAsSent(order)}
                                >
                                  {markShippedLoading ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Package className="w-4 h-4 mr-1" />
                                  )}
                                  {copy.markSent.button}
                                </Button>
                              )}
                            <Button size="sm" variant="outline" onClick={() => fetchOrderDetail(order.id)}>
                              <Settings className="w-4 h-4 mr-1" />
                              {copy.table.manageButton}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-5xl h-full bg-neutral-50 shadow-2xl border-l border-neutral-200 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-start justify-between z-10">
              <div>
                <h3 className="text-2xl font-light text-neutral-900">
                  {selectedOrder ? selectedOrder.order_number : copy.panel.fallbackTitle}
                </h3>
                {selectedOrder && (
                  (() => {
                    const selectedQuantities = getEggQuantities(selectedOrder)
                    return (
                      <p className="text-sm text-neutral-600 mt-1">
                        {replaceTokens(copy.panel.summaryValue, {
                          breed: selectedOrder.egg_breeds?.name || copy.fallbackBreedShort,
                          quantity: selectedQuantities.total,
                          week: selectedOrder.week_number,
                          year: selectedOrder.year,
                        })}
                        {selectedQuantities.additions > 0
                          ? ` (${replaceTokens(
                              copy.panel.quantityBreakdownValue || '{base} + {additions} = {total}',
                              {
                                base: selectedQuantities.base,
                                additions: selectedQuantities.additions,
                                total: selectedQuantities.total,
                              }
                            )})`
                          : ''}
                      </p>
                    )
                  })()
                )}
              </div>
              <Button variant="outline" onClick={() => setPanelOpen(false)} className="gap-2">
                <X className="w-4 h-4" />
                {copy.panel.closeButton}
              </Button>
            </div>

            {panelLoading || !selectedOrder || !form ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {(() => {
                  const paymentState = selectedPaymentState || getPaymentState(selectedOrder)
                  const statusLabel = getStatusLabel(selectedOrder.status)
                  const trackingUrl = buildTrackingUrl(selectedOrder.tracking_number)
                  const summaryOrderQuantities = selectedQuantities || getEggQuantities(selectedOrder)
                  const customerEmail = form.customerEmail || selectedOrder.customer_email || ''
                  const customerPhone = form.customerPhone || selectedOrder.customer_phone || ''
                  const shippingAddress = [
                    form.shippingAddress,
                    form.shippingPostalCode,
                    form.shippingCity,
                    form.shippingCountry,
                  ]
                    .map((value) => String(value || '').trim())
                    .filter(Boolean)
                    .join(', ')
                  const dueOre = Math.max(
                    0,
                    (selectedOrder.remainder_amount || 0) -
                      (selectedOrder.egg_payments || [])
                        .filter((payment) => payment.payment_type === 'remainder' && payment.status === 'completed')
                        .reduce((sum, payment) => sum + Math.round((payment.amount_nok || 0) * 100), 0)
                  )
                  const attentionClass = selectedShippingMissing
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : selectedOrderAtRisk || paymentState === 'deposit_pending' || paymentState === 'remainder_due'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : selectedOrder.status === 'delivered'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                  const attentionText = selectedShippingMissing
                    ? copy.filters.missingShippingData.replace('{count}', '1')
                    : selectedOrderAtRisk
                      ? getPaymentStateLabel(paymentState)
                      : paymentState === 'deposit_pending'
                        ? getPaymentStateLabel('deposit_pending')
                        : paymentState === 'remainder_due'
                          ? getPaymentStateLabel('remainder_due')
                          : statusLabel

                  return (
                    <>
                      <Card className="overflow-hidden border-neutral-200 shadow-sm">
                        <div className="border-b border-neutral-200 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 px-5 py-5">
                          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
                                  {statusLabel}
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                                    paymentBadgeClass(paymentState)
                                  )}
                                >
                                  {getPaymentStateLabel(paymentState)}
                                </span>
                                {selectedOrderAtRisk && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {copy.table.riskBadge}
                                  </span>
                                )}
                                {selectedShippingMissing && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                                    <Truck className="h-3.5 w-3.5" />
                                    {copy.table.shippingBadge}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{copy.table.order}</p>
                                <h4 className="mt-2 text-3xl font-light text-neutral-900">{selectedOrder.order_number}</h4>
                                <p className="mt-2 text-sm text-neutral-600">
                                  {replaceTokens(copy.panel.summaryValue, {
                                    breed: selectedOrder.egg_breeds?.name || copy.fallbackBreedShort,
                                    quantity: summaryOrderQuantities.total,
                                    week: selectedOrder.week_number,
                                    year: selectedOrder.year,
                                  })}
                                </p>
                                {summaryOrderQuantities.additions > 0 && (
                                  <p className="mt-1 text-xs text-neutral-500">
                                    {replaceTokens(copy.panel.quantityBreakdownValue, {
                                      base: summaryOrderQuantities.base,
                                      additions: summaryOrderQuantities.additions,
                                      total: summaryOrderQuantities.total,
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 xl:max-w-xl xl:justify-end">
                              <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => navigateToCustomerProfile(customerEmail, customerPhone)}
                                disabled={!resolveCustomerLookup(customerEmail, customerPhone)}
                              >
                                <UserRound className="h-4 w-4" />
                                {customerCopy.viewProfileButton}
                              </Button>
                              <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                  window.location.href = `mailto:${customerEmail}`
                                }}
                                disabled={!customerEmail}
                              >
                                <Mail className="h-4 w-4" />
                                {copy.panel.fields.email}
                              </Button>
                              <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                  window.location.href = `tel:${customerPhone}`
                                }}
                                disabled={!customerPhone}
                              >
                                <Phone className="h-4 w-4" />
                                {copy.panel.fields.phone}
                              </Button>
                              {trackingUrl ? (
                                <Button
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => window.open(trackingUrl, '_blank', 'noopener,noreferrer')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  {copy.panel.openTrackingButton}
                                </Button>
                              ) : selectedOrder.delivery_method === 'posten' &&
                                ['fully_paid', 'preparing'].includes(selectedOrder.status) ? (
                                <Button
                                  variant="outline"
                                  className="gap-2"
                                  disabled={markShippedLoading}
                                  onClick={() => handleMarkAsSent(selectedOrder)}
                                >
                                  {markShippedLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Package className="h-4 w-4" />
                                  )}
                                  {copy.markSent.button}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                              <UserRound className="h-3.5 w-3.5" />
                              {copy.table.customer}
                            </div>
                            <button
                              type="button"
                              onClick={() => navigateToCustomerProfile(customerEmail, customerPhone)}
                              className="mt-3 block text-left text-lg font-medium text-neutral-900 underline-offset-4 hover:underline"
                            >
                              {form.customerName || selectedOrder.customer_name}
                            </button>
                            <p className="mt-1 text-sm text-neutral-600 break-all">{customerEmail || customerCopy.notProvided}</p>
                            <p className="text-sm text-neutral-500">{customerPhone || customerCopy.notProvided}</p>
                          </div>

                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {copy.table.delivery}
                            </div>
                            <p className="mt-3 text-lg font-medium text-neutral-900">
                              {replaceTokens(copy.table.weekValue, {
                                week: selectedOrder.week_number,
                                year: selectedOrder.year,
                              })}
                            </p>
                            <p className="mt-1 text-sm text-neutral-600">{getDeliveryLabel(selectedOrder.delivery_method)}</p>
                            <p className="text-sm text-neutral-500">{formatDate(selectedOrder.delivery_monday)}</p>
                            <p className="mt-2 text-xs text-neutral-500">
                              {shippingAddress || customerCopy.notProvided}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                              <CircleDollarSign className="h-3.5 w-3.5" />
                              {copy.table.payment}
                            </div>
                            <p className="mt-3 text-lg font-medium text-neutral-900">{formatOre(selectedOrder.total_amount)}</p>
                            <p className="mt-1 text-sm text-neutral-600">{getPaymentStateLabel(paymentState)}</p>
                            <p className="mt-2 text-xs text-neutral-500">
                              {replaceTokens(copy.table.depositValue, { amount: formatOre(selectedOrder.deposit_amount) })}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {replaceTokens(copy.table.remainderValue, { amount: formatOre(dueOre) })}
                            </p>
                          </div>

                          <div className={cn('rounded-2xl border p-4', attentionClass)}>
                            <p className="text-xs uppercase tracking-[0.2em] opacity-70">{copy.stats.needsAttention}</p>
                            <p className="mt-3 text-lg font-medium">{attentionText}</p>
                            <p className="mt-1 text-sm opacity-80">
                              {selectedOrder.remainder_due_date
                                ? formatDate(selectedOrder.remainder_due_date)
                                : formatDate(selectedOrder.created_at)}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card className="border-neutral-200 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-medium text-neutral-900">{copy.panel.orderContentsTitle}</h4>
                              <p className="mt-1 text-sm text-neutral-600">
                                {replaceTokens(copy.table.breedEggsValue, {
                                  breed: selectedOrder.egg_breeds?.name || copy.fallbackBreed,
                                  quantity: summaryOrderQuantities.total,
                                })}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-neutral-900">{formatOre(selectedOrder.total_amount)}</p>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-neutral-900">
                                    {replaceTokens(copy.table.breedEggsValue, {
                                      breed: selectedOrder.egg_breeds?.name || copy.fallbackBreed,
                                      quantity: summaryOrderQuantities.base,
                                    })}
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-500">
                                    {replaceTokens(copy.table.weekValue, {
                                      week: selectedOrder.week_number,
                                      year: selectedOrder.year,
                                    })}
                                  </p>
                                </div>
                                <p className="text-sm font-medium text-neutral-900">{formatOre(selectedOrder.subtotal)}</p>
                              </div>
                            </div>

                            {(selectedOrder.egg_order_additions || []).length > 0 ? (
                              (selectedOrder.egg_order_additions || []).map((addition) => (
                                <div key={addition.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-neutral-900">
                                        {replaceTokens(copy.additions.breedEggsValue, {
                                          breed: addition.egg_breeds?.name || copy.fallbackBreedShort,
                                          quantity: addition.quantity,
                                        })}
                                      </p>
                                      <p className="mt-1 text-xs text-neutral-500">
                                        {replaceTokens(copy.additions.weekValue, {
                                          week: addition.egg_inventory?.week_number ?? '-',
                                          year: addition.egg_inventory?.year ?? '-',
                                        })}
                                      </p>
                                    </div>
                                    <p className="text-sm font-medium text-neutral-900">{formatOre(addition.subtotal)}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-neutral-600">{copy.additions.empty}</p>
                            )}
                          </div>
                        </Card>

                        <Card className="border-neutral-200 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-medium text-neutral-900">{copy.panel.customerShippingTitle}</h4>
                              <p className="mt-1 text-sm text-neutral-600">{getDeliveryLabel(selectedOrder.delivery_method)}</p>
                            </div>
                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={() => navigateToCustomerProfile(customerEmail, customerPhone)}
                              disabled={!resolveCustomerLookup(customerEmail, customerPhone)}
                            >
                              <UserRound className="h-4 w-4" />
                              {customerCopy.viewProfileButton}
                            </Button>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{copy.table.customer}</p>
                              <div className="mt-3 space-y-2 text-sm text-neutral-700">
                                <p><span className="font-medium text-neutral-900">{copy.panel.fields.name}:</span> {form.customerName || customerCopy.notProvided}</p>
                                <p><span className="font-medium text-neutral-900">{copy.panel.fields.email}:</span> {customerEmail || customerCopy.notProvided}</p>
                                <p><span className="font-medium text-neutral-900">{copy.panel.fields.phone}:</span> {customerPhone || customerCopy.notProvided}</p>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{copy.table.delivery}</p>
                              <div className="mt-3 space-y-2 text-sm text-neutral-700">
                                <p><span className="font-medium text-neutral-900">{copy.panel.fields.shippingName}:</span> {form.shippingName || form.customerName || customerCopy.notProvided}</p>
                                <p><span className="font-medium text-neutral-900">{copy.panel.fields.shippingEmail}:</span> {form.shippingEmail || customerCopy.notProvided}</p>
                                <p><span className="font-medium text-neutral-900">{copy.panel.fields.shippingPhone}:</span> {form.shippingPhone || customerCopy.notProvided}</p>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:col-span-2">
                              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                                <MapPin className="h-3.5 w-3.5" />
                                {copy.panel.fields.address}
                              </div>
                              <p className="mt-3 text-sm text-neutral-700">{shippingAddress || customerCopy.notProvided}</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="border-neutral-200 p-5">
                          <h4 className="text-lg font-medium text-neutral-900">{copy.panel.notesTitle}</h4>
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{copy.panel.fields.customerNotes}</p>
                              <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
                                {selectedOrder.notes || customerCopy.notProvided}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{copy.panel.fields.adminNotes}</p>
                              <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
                                {selectedOrder.admin_notes || customerCopy.notProvided}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </>
                  )
                })()}

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">{copy.panel.quickActionsTitle}</h4>

                  {/* Reason input */}
                  <div className="mb-4">
                    <Label className="text-xs text-neutral-500">{copy.panel.actionReasonLabel}</Label>
                    <Input
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                      placeholder={copy.panel.actionReasonPlaceholder}
                      className="mt-1"
                    />
                  </div>

                  {/* Primary payment actions */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Betalingshandlinger</p>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        disabled={actionLoading !== null}
                        onClick={() => runOrderAction('mark_deposit_paid', { reason: actionReason || undefined })}
                        className="justify-start"
                      >
                        {actionLoading === 'mark_deposit_paid' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {copy.panel.actions.markDepositPaid}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={actionLoading !== null}
                        onClick={() => runOrderAction('mark_remainder_paid', { reason: actionReason || undefined })}
                        className="justify-start"
                      >
                        {actionLoading === 'mark_remainder_paid' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {copy.panel.actions.markRemainderPaid}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={actionLoading !== null}
                        onClick={() => runOrderAction('sync_status', { reason: actionReason || undefined })}
                        className="justify-start"
                      >
                        {actionLoading === 'sync_status' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {copy.panel.actions.syncStatus}
                      </Button>
                    </div>
                  </div>

                  {/* Advanced / destructive actions toggle */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedActions((prev) => !prev)}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                    >
                      {showAdvancedActions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showAdvancedActions ? 'Skjul avanserte handlinger' : 'Vis avanserte handlinger'}
                    </button>

                    {showAdvancedActions && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Avanserte handlinger</p>
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                          <Button
                            variant="outline"
                            disabled={actionLoading !== null}
                            className="justify-start border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => openConfirmDialog(
                              'cancel_order',
                              (copy as any).confirm?.cancelTitle ?? 'Bekreft kansellering',
                              (copy as any).confirm?.cancelDescription ?? 'Er du sikker på at du vil kansellere denne ordren?'
                            )}
                          >
                            {actionLoading === 'cancel_order' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {copy.panel.actions.cancel}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={actionLoading !== null}
                            className="justify-start border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => openConfirmDialog(
                              'cancel_and_refund',
                              (copy as any).confirm?.cancelAndRefundTitle ?? 'Bekreft kansellering og refusjon',
                              (copy as any).confirm?.cancelAndRefundDescription ?? 'Er du sikker? Ordren kanselleres og depositum refunderes.'
                            )}
                          >
                            {actionLoading === 'cancel_and_refund' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {copy.panel.actions.cancelAndRefund}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={actionLoading !== null}
                            className="justify-start border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => openConfirmDialog(
                              'refund_deposit',
                              (copy as any).confirm?.refundDepositTitle ?? 'Bekreft refusjon',
                              (copy as any).confirm?.refundDepositDescription ?? 'Er du sikker på at du vil refundere depositum?'
                            )}
                          >
                            {actionLoading === 'refund_deposit' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {copy.panel.actions.refundDeposit}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={actionLoading !== null}
                            className="justify-start"
                            onClick={() => runOrderAction('mark_deposit_refunded', { reason: actionReason || undefined })}
                          >
                            {actionLoading === 'mark_deposit_refunded' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {copy.panel.actions.markDepositRefunded}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={actionLoading !== null}
                            className="justify-start"
                            onClick={() => runOrderAction('mark_remainder_refunded', { reason: actionReason || undefined })}
                          >
                            {actionLoading === 'mark_remainder_refunded' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {copy.panel.actions.markRemainderRefunded}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">{copy.panel.moveSectionTitle}</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>{copy.panel.newWeekLabel}</Label>
                      <div className="flex gap-2">
                        <Input value={moveWeek} onChange={(event) => setMoveWeek(event.target.value)} />
                        <Input value={moveYear} onChange={(event) => setMoveYear(event.target.value)} />
                      </div>
                      <Button
                        variant="outline"
                        disabled={actionLoading !== null}
                        onClick={() =>
                          runOrderAction('move_week', {
                            weekNumber: Number(moveWeek || 0),
                            year: Number(moveYear || 0),
                            reason: actionReason || undefined,
                          })
                        }
                      >
                        {copy.panel.moveOrderButton}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>{copy.panel.deliveryMethodLabel}</Label>
                      <div className="flex gap-2">
                        <select
                          value={deliveryActionMethod}
                          onChange={(event) => {
                            const method = event.target.value
                            setDeliveryActionMethod(method)
                            setDeliveryActionFee(String(getDefaultDeliveryFee(method)))
                          }}
                          className="h-10 flex-1 rounded-md border border-neutral-200 px-3 text-sm"
                        >
                          {deliveryOptions
                            .filter((option) => option.value !== 'all')
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                        <Input
                          value={deliveryActionFee}
                          onChange={(event) => setDeliveryActionFee(event.target.value)}
                          className="w-28"
                        />
                      </div>
                      <Button
                        variant="outline"
                        disabled={actionLoading !== null}
                        onClick={() =>
                          runOrderAction('update_delivery', {
                            deliveryMethod: deliveryActionMethod,
                            deliveryFee: Number(deliveryActionFee || 0),
                            reason: actionReason || undefined,
                          })
                        }
                      >
                        {copy.panel.updateDeliveryButton}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>{copy.panel.manualStatusLabel}</Label>
                      <div className="flex gap-2">
                        <select
                          value={manualStatus}
                          onChange={(event) => setManualStatus(event.target.value)}
                          className="h-10 flex-1 rounded-md border border-neutral-200 px-3 text-sm"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        disabled={actionLoading !== null}
                        onClick={() =>
                          runOrderAction('set_status', {
                            status: manualStatus,
                            reason: actionReason || undefined,
                          })
                        }
                      >
                        {copy.bulk.setStatusButton}
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">{copy.panel.editSectionTitle}</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div>
                      <Label>{copy.panel.fields.name}</Label>
                      <Input
                        value={form.customerName}
                        onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.email}</Label>
                      <Input
                        value={form.customerEmail}
                        onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.phone}</Label>
                      <Input
                        value={form.customerPhone}
                        onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.shippingName}</Label>
                      <Input
                        value={form.shippingName}
                        onChange={(event) => setForm({ ...form, shippingName: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.shippingEmail}</Label>
                      <Input
                        value={form.shippingEmail}
                        onChange={(event) => setForm({ ...form, shippingEmail: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.shippingPhone}</Label>
                      <Input
                        value={form.shippingPhone}
                        onChange={(event) => setForm({ ...form, shippingPhone: event.target.value })}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>{copy.panel.fields.address}</Label>
                      <Input
                        value={form.shippingAddress}
                        onChange={(event) => setForm({ ...form, shippingAddress: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.postalCode}</Label>
                      <Input
                        value={form.shippingPostalCode}
                        onChange={(event) => setForm({ ...form, shippingPostalCode: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.city}</Label>
                      <Input
                        value={form.shippingCity}
                        onChange={(event) => setForm({ ...form, shippingCity: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.country}</Label>
                      <Input
                        value={form.shippingCountry}
                        onChange={(event) => setForm({ ...form, shippingCountry: event.target.value })}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">{copy.panel.pricingStatusNotesTitle}</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                    <div>
                      <Label>{copy.panel.fields.eggCount}</Label>
                      <Input
                        type="number"
                        value={form.quantity}
                        onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.pricePerEggOre}</Label>
                      <Input
                        type="number"
                        value={form.pricePerEgg}
                        onChange={(event) => setForm({ ...form, pricePerEgg: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.deliveryMethodLabel}</Label>
                      <select
                        value={form.deliveryMethod}
                        onChange={(event) => {
                          const method = event.target.value
                          setForm({
                            ...form,
                            deliveryMethod: method,
                            deliveryFee: String(getDefaultDeliveryFee(method)),
                          })
                        }}
                        className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm"
                      >
                        {deliveryOptions
                          .filter((option) => option.value !== 'all')
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <Label>{copy.panel.fields.deliveryFeeOre}</Label>
                      <Input
                        type="number"
                        value={form.deliveryFee}
                        onChange={(event) => setForm({ ...form, deliveryFee: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.depositOre}</Label>
                      <Input
                        type="number"
                        value={form.depositAmount}
                        onChange={(event) => setForm({ ...form, depositAmount: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.remainderOre}</Label>
                      <Input
                        type="number"
                        value={form.remainderAmount}
                        onChange={(event) => setForm({ ...form, remainderAmount: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.filters.statusLabel}</Label>
                      <select
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                        className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>{copy.panel.fields.locking}</Label>
                      <label className="h-10 w-full border border-neutral-200 rounded-md px-3 inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.lockOrder}
                          onChange={(event) => setForm({ ...form, lockOrder: event.target.checked })}
                        />
                        {copy.panel.fields.lockOrder}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label>{copy.panel.fields.customerNotes}</Label>
                      <Textarea
                        rows={3}
                        value={form.notes}
                        onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{copy.panel.fields.adminNotes}</Label>
                      <Textarea
                        rows={3}
                        value={form.adminNotes}
                        onChange={(event) => setForm({ ...form, adminNotes: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label>{copy.panel.fields.appendAdminNote}</Label>
                    <Textarea
                      rows={2}
                      value={form.appendAdminNote}
                      onChange={(event) => setForm({ ...form, appendAdminNote: event.target.value })}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button onClick={saveOrderEdits} disabled={saveLoading || actionLoading !== null}>
                      {saveLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {copy.panel.saveChangesButton}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saveLoading || actionLoading !== null}
                      onClick={() =>
                        runOrderAction('set_status', { status: 'delivered', reason: copy.panel.markDeliveredReason })
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {copy.panel.markDeliveredButton}
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">{copy.payments.title}</h4>
                  {(selectedOrder.egg_payments || []).length === 0 ? (
                    <p className="text-sm text-neutral-600">{copy.payments.empty}</p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedOrder.egg_payments || [])
                        .slice()
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((payment) => (
                          <div
                            key={payment.id}
                            className="rounded-md border border-neutral-200 p-3 flex items-center justify-between text-sm"
                          >
                            <div>
                              <p className="font-medium text-neutral-900">
                                {payment.payment_type === 'deposit'
                                  ? copy.payments.depositType
                                  : copy.payments.remainderType}{' '}
                                |{' '}
                                {formatOre((payment.amount_nok || 0) * 100)}
                              </p>
                              <p className="text-neutral-600">
                                {replaceTokens(copy.payments.statusValue, {
                                  status: getPaymentStatusLabel(payment.status),
                                })}{' '}
                                |{' '}
                                {replaceTokens(copy.payments.createdValue, {
                                  date: formatDate(payment.created_at),
                                })}{' '}
                                {payment.paid_at
                                  ? `| ${replaceTokens(copy.payments.paidValue, { date: formatDate(payment.paid_at) })}`
                                  : ''}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                payment.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : payment.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : payment.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-slate-200 text-slate-700'
                              )}
                            >
                              {getPaymentStatusLabel(payment.status)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">{copy.additions.title}</h4>
                  {(selectedOrder.egg_order_additions || []).length === 0 ? (
                    <p className="text-sm text-neutral-600">{copy.additions.empty}</p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedOrder.egg_order_additions || []).map((addition) => (
                        <div
                          key={addition.id}
                          className="rounded-md border border-neutral-200 p-3 flex items-center justify-between text-sm"
                        >
                          <div>
                            <p className="font-medium text-neutral-900">
                              {replaceTokens(copy.additions.breedEggsValue, {
                                breed: addition.egg_breeds?.name || copy.fallbackBreedShort,
                                quantity: addition.quantity,
                              })}
                            </p>
                            <p className="text-neutral-600">
                              {replaceTokens(copy.additions.weekValue, {
                                week: addition.egg_inventory?.week_number ?? '-',
                                year: addition.egg_inventory?.year ?? '-',
                              })}
                            </p>
                          </div>
                          <p className="font-medium text-neutral-900">{formatOre(addition.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog for destructive actions */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {actionReason && (
            <p className="text-sm text-neutral-600 px-1">
              Årsak: <em>{actionReason}</em>
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>
              {(copy as any).confirm?.cancelButton ?? 'Avbryt'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedAction}>
              {(copy as any).confirm?.confirmButton ?? 'Bekreft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={trackingModalOpen} onOpenChange={setTrackingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.markSent.modalTitle}</DialogTitle>
            <DialogDescription>{copy.markSent.modalDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>{copy.markSent.trackingLabel}</Label>
            <Input
              value={trackingNumberInput}
              onChange={(e) => setTrackingNumberInput(e.target.value)}
              placeholder={copy.markSent.trackingPlaceholder}
            />
            <p className="text-xs text-neutral-500">{copy.markSent.formatHint}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingModalOpen(false)}>
              {copy.markSent.cancelButton}
            </Button>
            <Button
              onClick={submitTrackingNumber}
              disabled={markShippedLoading || trackingNumberInput.trim().length < 5}
            >
              {markShippedLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {copy.markSent.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
