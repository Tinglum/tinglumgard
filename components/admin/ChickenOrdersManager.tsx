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
  quantity_hens: number
  quantity_roosters: number
  price_per_hen_nok?: number
  price_per_rooster_nok?: number
  subtotal_nok: number
  status: string
  created_at: string
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

export function ChickenOrdersManager() {
  const { toast } = useToast()
  const { t, lang } = useLanguage()
  const co = (t as any).admin.chickenOrders
  const [orders, setOrders] = useState<ChickenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ChickenOrder | null>(null)
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null)
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

  const getOrderBirdTotals = useCallback((order: ChickenOrder) => {
    const additionsHens = (order.chicken_order_additions || []).reduce(
      (sum, row) => sum + Number(row.quantity_hens || 0),
      0
    )
    const additionsRoosters = (order.chicken_order_additions || []).reduce(
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
  }, [])

  const getOrderFinancialTotals = useCallback((order: ChickenOrder) => {
    const additionsSubtotal = (order.chicken_order_additions || []).reduce(
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
    const paidTotal = (order.chicken_payments || []).reduce((sum, payment) => {
      if (payment.status !== 'completed') return sum
      return sum + Number(payment.amount_nok || 0)
    }, 0)
    const remaining = Math.max(0, grandTotal - paidTotal)
    return { baseSubtotal, additionsSubtotal, deliveryFee, grandTotal, paidTotal, remaining }
  }, [getAdditionSubtotal])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/chickens/orders')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      toast({ title: co.errorFetchTitle, description: co.errorFetchDescription, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [co.errorFetchDescription, co.errorFetchTitle, toast])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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
        setSelectedOrder(data)
      } catch {
        toast({ title: co.errorFetchTitle, description: co.errorFetchDetailDescription, variant: 'destructive' })
      } finally {
        setDetailLoading(false)
      }
    },
    [co.errorFetchDetailDescription, co.errorFetchTitle, orders, toast]
  )

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

  const filtered = orders.filter((order) => {
    const matchesSearch = !searchTerm ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
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
              const isResending = resendingOrderId === order.id
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
                    <div className="font-medium">{order.customer_name}</div>
                    <div className="text-xs text-gray-500">{order.customer_email}</div>
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
                  <td className="py-2 pr-3">{co.ageWeeksLabel.replace('{weeks}', String(order.age_weeks_at_pickup))}</td>
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
                  {(selectedOrder.chicken_payments || []).length === 0 && (
                    <p className="text-sm text-gray-500">{co.detailNoPayments}</p>
                  )}
                  {(selectedOrder.chicken_payments || []).map((payment) => (
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
                      <DetailRow label={co.labelAdditionSubtotal} value={formatMoney(financial.baseSubtotal)} />
                    </div>
                    {(selectedOrder.chicken_order_additions || []).map((addition) => (
                      <div key={addition.id} className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
                        <DetailRow label={co.labelBreed} value={addition.chicken_breeds?.name || co.unknownBreed} />
                        <DetailRow
                          label={co.labelAdditionQuantity}
                          value={`${co.labelHens}: ${addition.quantity_hens}, ${co.labelRoosters}: ${addition.quantity_roosters}`}
                        />
                        <DetailRow label={co.labelAdditionSubtotal} value={formatMoney(getAdditionSubtotal(addition))} />
                      </div>
                    ))}
                  </div>
                </div>
                  )
                })()}

                {(selectedOrder.chicken_order_additions || []).length === 0 && (
                  <p className="text-sm text-gray-500">{co.detailNoAdditions}</p>
                )}
              </CardSection>

              <div className="flex flex-wrap items-center justify-end gap-2">
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

