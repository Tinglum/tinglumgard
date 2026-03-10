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
  subtotal_nok: number
  status: string
  created_at: string
  chicken_breeds?: { name: string; slug: string; accent_color: string }
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
              return (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => void openOrderDetails(order.id)}
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
                    {order.quantity_hens}H
                    {order.quantity_roosters > 0 && <span className="text-gray-500"> +{order.quantity_roosters}R</span>}
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
                  <td className="py-2">
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
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{co.detailTitle.replace('{order}', selectedOrder?.order_number || co.notAvailable)}</DialogTitle>
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
                </CardSection>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CardSection title={co.detailFinancialTitle}>
                  <DetailRow label={co.labelSubtotal} value={formatMoney(selectedOrder.subtotal_nok)} />
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
                {(selectedOrder.chicken_order_additions || []).length === 0 && (
                  <p className="text-sm text-gray-500">{co.detailNoAdditions}</p>
                )}
                <div className="space-y-2">
                  {(selectedOrder.chicken_order_additions || []).map((addition) => (
                    <div key={addition.id} className="rounded border border-gray-200 p-3 text-sm grid gap-1 md:grid-cols-3">
                      <DetailRow label={co.labelBreed} value={addition.chicken_breeds?.name || co.unknownBreed} />
                      <DetailRow
                        label={co.labelAdditionQuantity}
                        value={`${co.labelHens}: ${addition.quantity_hens}, ${co.labelRoosters}: ${addition.quantity_roosters}`}
                      />
                      <DetailRow label={co.labelAdditionSubtotal} value={formatMoney(addition.subtotal_nok)} />
                    </div>
                  ))}
                </div>
              </CardSection>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-gray-200 p-4 space-y-2">
      <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
      {children}
    </section>
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
      <span className="text-gray-500">{label}</span>
      <span className={multiline ? 'whitespace-pre-wrap' : ''}>{value}</span>
    </div>
  )
}

