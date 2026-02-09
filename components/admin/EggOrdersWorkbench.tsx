'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react'

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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Venter forskudd' },
  { value: 'deposit_paid', label: 'Forskudd betalt' },
  { value: 'fully_paid', label: 'Fullt betalt' },
  { value: 'preparing', label: 'Forberedes' },
  { value: 'shipped', label: 'Sendt' },
  { value: 'delivered', label: 'Levert' },
  { value: 'cancelled', label: 'Kansellert' },
  { value: 'forfeited', label: 'Fortapt' },
]

const PAYMENT_OPTIONS: Array<{ value: 'all' | PaymentState; label: string }> = [
  { value: 'all', label: 'Alle betalingsstater' },
  { value: 'deposit_pending', label: 'Mangler forskudd' },
  { value: 'remainder_due', label: 'Restbelop ubetalt' },
  { value: 'fully_paid', label: 'Fullt betalt' },
  { value: 'refunded', label: 'Refundert' },
  { value: 'failed', label: 'Feilet' },
]

const DELIVERY_OPTIONS = [
  { value: 'all', label: 'Alle leveringsmetoder' },
  { value: 'posten', label: 'Posten' },
  { value: 'e6_pickup', label: 'E6 motepunkt' },
  { value: 'farm_pickup', label: 'Henting pa gard' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Nyeste forst' },
  { value: 'oldest', label: 'Eldste forst' },
  { value: 'delivery_asc', label: 'Tidligste levering' },
  { value: 'delivery_desc', label: 'Seneste levering' },
  { value: 'amount_desc', label: 'Hoyeste belop' },
  { value: 'amount_asc', label: 'Laveste belop' },
  { value: 'week_asc', label: 'Uke stigende' },
  { value: 'week_desc', label: 'Uke synkende' },
]

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

function formatOre(value: number | null | undefined): string {
  const safe = Number(value || 0)
  return `kr ${(safe / 100).toLocaleString('nb-NO')}`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('nb-NO')
}

function getDeliveryLabel(method: string): string {
  if (method === 'posten') return 'Posten'
  if (method === 'e6_pickup') return 'E6 motepunkt'
  if (method === 'farm_pickup') return 'Henting pa gard'
  return method
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

function getPaymentStateLabel(state: PaymentState): string {
  if (state === 'deposit_pending') return 'Mangler forskudd'
  if (state === 'remainder_due') return 'Restbelop ubetalt'
  if (state === 'fully_paid') return 'Fullt betalt'
  if (state === 'refunded') return 'Refundert'
  return 'Feilet'
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
  return !(
    order.shipping_name &&
    order.shipping_phone &&
    order.shipping_address &&
    order.shipping_postal_code &&
    order.shipping_city
  )
}

function toFormState(order: EggOrder): EggOrderFormState {
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
    shippingCountry: order.shipping_country || 'Norge',
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

export function EggOrdersWorkbench() {
  const { toast } = useToast()
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

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
          throw new Error(data?.error || 'Failed to load egg orders')
        }

        setOrders(Array.isArray(data.orders) ? data.orders : [])
        setSummary(data.summary || EMPTY_SUMMARY)
        setAvailableWeeks(Array.isArray(data.availableWeeks) ? data.availableWeeks : [])
      } catch (error: any) {
        setErrorText(error?.message || 'Failed to load egg orders')
      } finally {
        if (isBackgroundRefresh) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [searchTerm, statusFilter, paymentFilter, deliveryFilter, weekFilter, atRiskOnly, sortBy]
  )

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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
        throw new Error(data?.error || 'Failed to fetch order details')
      }
      const order = data as EggOrder
      setSelectedOrder(order)
      setForm(toFormState(order))
      setMoveWeek(String(order.week_number || ''))
      setMoveYear(String(order.year || ''))
      setManualStatus(order.status || 'deposit_paid')
      setDeliveryActionMethod(order.delivery_method || 'posten')
      setDeliveryActionFee(String(order.delivery_fee || 0))
      setActionReason('')
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke hente ordredetaljer',
        variant: 'destructive',
      })
      setPanelOpen(false)
      setSelectedOrder(null)
      setForm(null)
    } finally {
      setPanelLoading(false)
    }
  }

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
        throw new Error(data?.error || 'Failed to save order')
      }

      const nextOrder = (data?.order || data) as EggOrder
      setSelectedOrder(nextOrder)
      setForm(toFormState(nextOrder))

      toast({
        title: 'Lagret',
        description: 'Ordren er oppdatert',
      })

      await fetchOrders(true)
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke lagre ordren',
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
        throw new Error(result?.error || 'Action failed')
      }

      toast({
        title: 'Oppdatert',
        description: 'Handling fullfort',
      })

      await Promise.all([refreshSelectedOrder(), fetchOrders(true)])
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke utfore handling',
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
        throw new Error(result?.error || 'Bulk action failed')
      }

      const failures = Array.isArray(result?.failures) ? result.failures : []
      if (failures.length > 0) {
        toast({
          title: 'Delvis fullfort',
          description: `${result?.affected || 0} oppdatert, ${failures.length} feilet`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Oppdatert',
          description: `${result?.affected || selectedIds.size} ordre(r) oppdatert`,
        })
      }

      setSelectedIds(new Set())
      await fetchOrders(true)
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke utfore bulk handling',
        variant: 'destructive',
      })
    } finally {
      setBulkLoading(false)
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
        throw new Error('Failed to export CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `egg-orders-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke eksportere CSV',
        variant: 'destructive',
      })
    }
  }

  const revenue = useMemo(() => formatOre(summary.revenueOre), [summary.revenueOre])
  const outstanding = useMemo(() => formatOre(summary.outstandingOre), [summary.outstandingOre])

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-neutral-900">Egg Orders Workbench</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Full styring av egg-ordre, betaling, levering, notater og korrigeringer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Oppdater
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Ordre</p>
          <p className="text-2xl font-semibold text-neutral-900">{summary.filteredOrders}</p>
          <p className="text-xs text-neutral-500">av {summary.totalOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Mangler forskudd</p>
          <p className="text-2xl font-semibold text-orange-700">{summary.pendingDeposit}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Restbelop ubetalt</p>
          <p className="text-2xl font-semibold text-amber-700">{summary.remainderDue}</p>
          <p className="text-xs text-neutral-500">{outstanding}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Fullt betalt</p>
          <p className="text-2xl font-semibold text-emerald-700">{summary.fullyPaid}</p>
          <p className="text-xs text-neutral-500">{revenue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Krever oppfolging</p>
          <div className="flex items-center gap-2 text-red-700 font-semibold text-xl">
            <ShieldAlert className="w-5 h-5" />
            {summary.atRisk}
          </div>
          <p className="text-xs text-neutral-500">Frakt mangler: {summary.shippingMissing}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          <div className="xl:col-span-2">
            <Label className="text-xs text-neutral-500">Sok</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Ordre, navn, e-post, telefon..."
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Status</Label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              <option value="all">Alle statuser</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Betaling</Label>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as 'all' | PaymentState)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Levering</Label>
            <select
              value={deliveryFilter}
              onChange={(event) => setDeliveryFilter(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              {DELIVERY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Uke</Label>
            <select
              value={weekFilter}
              onChange={(event) => setWeekFilter(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              <option value="all">Alle uker</option>
              {availableWeeks.map((week) => (
                <option key={week.value} value={week.value}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Sortering</Label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white"
            >
              {SORT_OPTIONS.map((option) => (
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
            Vis kun ordre med risiko
          </label>
          {(summary.failedPayments > 0 || summary.shippingMissing > 0) && (
            <div className="text-xs text-neutral-600 flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                Betaling feilet: {summary.failedPayments}
              </span>
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-500" />
                Mangler fraktdata: {summary.shippingMissing}
              </span>
            </div>
          )}
        </div>
      </Card>

      {selectedCount > 0 && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-900">{selectedCount} ordre(r) valgt</p>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="flex gap-2">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  className="h-10 flex-1 rounded-md border border-blue-200 px-3 text-sm bg-white"
                >
                  {STATUS_OPTIONS.map((option) => (
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
                  Sett status
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
                  <option value="posten">Posten</option>
                  <option value="e6_pickup">E6 motepunkt</option>
                  <option value="farm_pickup">Henting pa gard</option>
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
                  Levering
                </Button>
              </div>
              <div className="flex gap-2 lg:col-span-2">
                <Input
                  value={bulkNote}
                  onChange={(event) => setBulkNote(event.target.value)}
                  placeholder="Legg til felles admin-notat..."
                />
                <Button
                  variant="outline"
                  disabled={bulkLoading || !bulkNote.trim()}
                  onClick={() => {
                    runBulkAction('append_admin_note', { note: bulkNote.trim() })
                    setBulkNote('')
                  }}
                >
                  Notat
                </Button>
                <Button variant="outline" disabled={bulkLoading} onClick={() => runBulkAction('lock_orders', {})}>
                  Las
                </Button>
                <Button variant="outline" disabled={bulkLoading} onClick={() => runBulkAction('unlock_orders', {})}>
                  Las opp
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
        </Card>
      ) : errorText ? (
        <Card className="p-8 text-center">
          <p className="text-red-600 font-medium">Kunne ikke laste egg-ordrer</p>
          <p className="text-sm text-neutral-600 mt-2">{errorText}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchOrders()}>
            Prov igjen
          </Button>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center text-neutral-600">Ingen egg-ordrer matcher filtrene.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Ordre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Kunde</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Levering</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Betaling</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Belop</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => {
                  const paymentState = getPaymentState(order)
                  const orderAtRisk = isAtRiskOrder(order)
                  const shippingMissing = hasMissingShipping(order)
                  const statusLabel =
                    STATUS_OPTIONS.find((option) => option.value === order.status)?.label || order.status

                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded border-neutral-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <button
                            className="font-semibold text-blue-700 hover:text-blue-900"
                            onClick={() => fetchOrderDetail(order.id)}
                          >
                            {order.order_number}
                          </button>
                          <p className="text-xs text-neutral-500 mt-1">
                            {order.egg_breeds?.name || 'Ukjent rase'} · {order.quantity} egg
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium text-neutral-900">{order.customer_name}</p>
                        <p className="text-neutral-600">{order.customer_email}</p>
                        {order.customer_phone && <p className="text-neutral-500">{order.customer_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="text-neutral-900">
                          Uke {order.week_number}/{order.year}
                        </p>
                        <p className="text-neutral-600">{getDeliveryLabel(order.delivery_method)}</p>
                        <p className="text-neutral-500">{formatDate(order.delivery_monday)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                            paymentBadgeClass(paymentState)
                          )}
                        >
                          {getPaymentStateLabel(paymentState)}
                        </span>
                        {(orderAtRisk || shippingMissing) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {orderAtRisk && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-100 text-red-800">
                                <AlertTriangle className="w-3 h-3" />
                                Risiko
                              </span>
                            )}
                            {shippingMissing && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800">
                                <Truck className="w-3 h-3" />
                                Fraktdata
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-medium">
                          {statusLabel}
                        </span>
                        {order.locked_at && <p className="text-xs text-neutral-500 mt-1">Last</p>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-semibold text-neutral-900">{formatOre(order.total_amount)}</p>
                        <p className="text-neutral-600">Forskudd: {formatOre(order.deposit_amount)}</p>
                        <p className="text-neutral-500">Rest: {formatOre(order.remainder_amount)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => fetchOrderDetail(order.id)}>
                            <Settings className="w-4 h-4 mr-1" />
                            Administrer
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
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-4xl h-full bg-white shadow-2xl border-l border-neutral-200 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-start justify-between z-10">
              <div>
                <h3 className="text-2xl font-light text-neutral-900">
                  {selectedOrder ? selectedOrder.order_number : 'Egg ordre'}
                </h3>
                {selectedOrder && (
                  <p className="text-sm text-neutral-600 mt-1">
                    {selectedOrder.egg_breeds?.name || 'Rase'} · {selectedOrder.quantity} egg · Uke{' '}
                    {selectedOrder.week_number}/{selectedOrder.year}
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={() => setPanelOpen(false)} className="gap-2">
                <X className="w-4 h-4" />
                Lukk
              </Button>
            </div>

            {panelLoading || !selectedOrder || !form ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">Hurtighandlinger</h4>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() => runOrderAction('mark_deposit_paid', { reason: actionReason || undefined })}
                    >
                      Marker forskudd betalt
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() => runOrderAction('mark_remainder_paid', { reason: actionReason || undefined })}
                    >
                      Marker rest betalt
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() => runOrderAction('sync_status', { reason: actionReason || undefined })}
                    >
                      Synk status
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() => runOrderAction('refund_deposit', { reason: actionReason || undefined })}
                    >
                      Refunder forskudd
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() =>
                        runOrderAction('cancel_order', {
                          releaseInventory: true,
                          reason: actionReason || undefined,
                        })
                      }
                    >
                      Kanseller
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() =>
                        runOrderAction('cancel_and_refund', {
                          releaseInventory: true,
                          reason: actionReason || undefined,
                        })
                      }
                    >
                      Kanseller + refunder
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() => runOrderAction('mark_deposit_refunded', { reason: actionReason || undefined })}
                    >
                      Marker forskudd refundert
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() => runOrderAction('mark_remainder_refunded', { reason: actionReason || undefined })}
                    >
                      Marker rest refundert
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-neutral-500">Arsak for handlinger (valgfritt)</Label>
                    <Input
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                      placeholder="Notat/reason for action"
                      className="mt-1"
                    />
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">Flytt uke / levering / status</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Ny uke</Label>
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
                        Flytt ordre
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Leveringsmetode</Label>
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
                          <option value="posten">Posten</option>
                          <option value="e6_pickup">E6 motepunkt</option>
                          <option value="farm_pickup">Henting pa gard</option>
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
                        Oppdater levering
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Manuell status</Label>
                      <div className="flex gap-2">
                        <select
                          value={manualStatus}
                          onChange={(event) => setManualStatus(event.target.value)}
                          className="h-10 flex-1 rounded-md border border-neutral-200 px-3 text-sm"
                        >
                          {STATUS_OPTIONS.map((option) => (
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
                        Sett status
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">Kunde og shipping</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div>
                      <Label>Navn</Label>
                      <Input
                        value={form.customerName}
                        onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>E-post</Label>
                      <Input
                        value={form.customerEmail}
                        onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      <Input
                        value={form.customerPhone}
                        onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Shipping navn</Label>
                      <Input
                        value={form.shippingName}
                        onChange={(event) => setForm({ ...form, shippingName: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Shipping e-post</Label>
                      <Input
                        value={form.shippingEmail}
                        onChange={(event) => setForm({ ...form, shippingEmail: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Shipping telefon</Label>
                      <Input
                        value={form.shippingPhone}
                        onChange={(event) => setForm({ ...form, shippingPhone: event.target.value })}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>Adresse</Label>
                      <Input
                        value={form.shippingAddress}
                        onChange={(event) => setForm({ ...form, shippingAddress: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Postnummer</Label>
                      <Input
                        value={form.shippingPostalCode}
                        onChange={(event) => setForm({ ...form, shippingPostalCode: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>By</Label>
                      <Input
                        value={form.shippingCity}
                        onChange={(event) => setForm({ ...form, shippingCity: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Land</Label>
                      <Input
                        value={form.shippingCountry}
                        onChange={(event) => setForm({ ...form, shippingCountry: event.target.value })}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">Pris, status, notater</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                    <div>
                      <Label>Antall egg</Label>
                      <Input
                        type="number"
                        value={form.quantity}
                        onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Pris per egg (ore)</Label>
                      <Input
                        type="number"
                        value={form.pricePerEgg}
                        onChange={(event) => setForm({ ...form, pricePerEgg: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Leveringsmetode</Label>
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
                        <option value="posten">Posten</option>
                        <option value="e6_pickup">E6 motepunkt</option>
                        <option value="farm_pickup">Henting pa gard</option>
                      </select>
                    </div>
                    <div>
                      <Label>Leveringsgebyr (ore)</Label>
                      <Input
                        type="number"
                        value={form.deliveryFee}
                        onChange={(event) => setForm({ ...form, deliveryFee: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Forskudd (ore)</Label>
                      <Input
                        type="number"
                        value={form.depositAmount}
                        onChange={(event) => setForm({ ...form, depositAmount: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Restbelop (ore)</Label>
                      <Input
                        type="number"
                        value={form.remainderAmount}
                        onChange={(event) => setForm({ ...form, remainderAmount: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <select
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                        className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Lasing</Label>
                      <label className="h-10 w-full border border-neutral-200 rounded-md px-3 inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.lockOrder}
                          onChange={(event) => setForm({ ...form, lockOrder: event.target.checked })}
                        />
                        Las ordren
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label>Kundenotater</Label>
                      <Textarea
                        rows={3}
                        value={form.notes}
                        onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Admin-notater</Label>
                      <Textarea
                        rows={3}
                        value={form.adminNotes}
                        onChange={(event) => setForm({ ...form, adminNotes: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label>Legg til nytt admin-notat (append)</Label>
                    <Textarea
                      rows={2}
                      value={form.appendAdminNote}
                      onChange={(event) => setForm({ ...form, appendAdminNote: event.target.value })}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button onClick={saveOrderEdits} disabled={saveLoading || actionLoading !== null}>
                      {saveLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Lagre endringer
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saveLoading || actionLoading !== null}
                      onClick={() => runOrderAction('set_status', { status: 'delivered', reason: 'Marked delivered' })}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Marker levert
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">Betalingshistorikk</h4>
                  {(selectedOrder.egg_payments || []).length === 0 ? (
                    <p className="text-sm text-neutral-600">Ingen betalinger registrert.</p>
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
                                {payment.payment_type === 'deposit' ? 'Forskudd' : 'Restbetaling'} ·{' '}
                                {formatOre((payment.amount_nok || 0) * 100)}
                              </p>
                              <p className="text-neutral-600">
                                Status: {payment.status} · Opprettet: {formatDate(payment.created_at)}{' '}
                                {payment.paid_at ? `· Betalt: ${formatDate(payment.paid_at)}` : ''}
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
                              {payment.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4 border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">Tillegg / upsell</h4>
                  {(selectedOrder.egg_order_additions || []).length === 0 ? (
                    <p className="text-sm text-neutral-600">Ingen tillegg registrert.</p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedOrder.egg_order_additions || []).map((addition) => (
                        <div
                          key={addition.id}
                          className="rounded-md border border-neutral-200 p-3 flex items-center justify-between text-sm"
                        >
                          <div>
                            <p className="font-medium text-neutral-900">
                              {addition.egg_breeds?.name || 'Rase'} · {addition.quantity} egg
                            </p>
                            <p className="text-neutral-600">
                              Uke {addition.egg_inventory?.week_number}/{addition.egg_inventory?.year}
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
    </div>
  )
}
