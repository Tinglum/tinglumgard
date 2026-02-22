'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowRight,
  Calendar,
  CreditCard,
  EllipsisVertical,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Printer,
  ShoppingCart,
} from 'lucide-react'
import { ExtrasUpsellModal } from '@/components/ExtrasUpsellModal'
import { OrderModificationModal } from '@/components/OrderModificationModal'
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal'
import { ContactAdminModal } from '@/components/ContactAdminModal'
import { OrderTimelineModal } from '@/components/OrderTimelineModal'
import { StepTimeline } from '@/components/orders/StepTimeline'

interface Payment {
  id: string
  payment_type: string
  status: string
  amount_nok: number
  paid_at: string | null
}

interface Order {
  id: string
  order_number: string
  box_size: number | null
  effective_box_size?: number
  display_box_name_no?: string | null
  display_box_name_en?: string | null
  status: string
  delivery_type: string
  fresh_delivery: boolean
  ribbe_choice: string
  extra_products: any[]
  notes: string
  admin_notes: string
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  customer_name: string
  customer_email: string
  customer_phone: string
  created_at: string
  last_modified_at: string
  locked_at: string | null
  marked_delivered_at: string | null
  at_risk: boolean
  payments: Payment[]
}

interface PigOrderUnifiedCardProps {
  order: Order
  canEdit: boolean
  onPayRemainder: (orderId: string) => void
  onRefresh: () => void
}

const toDateOnly = (value: string | Date) => {
  const date = new Date(value)
  return new Date(date.toISOString().split('T')[0])
}

const daysBetween = (future: Date, today: Date) => {
  const diffMs = future.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function PigOrderUnifiedCard({ order, canEdit, onPayRemainder, onRefresh }: PigOrderUnifiedCardProps) {
  const { toast } = useToast()
  const { lang, t } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'nb-NO'
  const copy = t.orderDetailsCard
  const statusTimelineCopy = t.orderStatusTimeline
  const currency = t.common.currency
  const daysLeftLabel = t.eggs.common.daysLeft

  const [showExtrasModal, setShowExtrasModal] = useState(false)
  const [showModificationModal, setShowModificationModal] = useState(false)
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [addingExtras, setAddingExtras] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [extrasError, setExtrasError] = useState<string | null>(null)
  const [contactInfo, setContactInfo] = useState<{
    email: string
    phone: string
  }>({
    email: copy.contactEmail,
    phone: copy.contactPhone,
  })

  const depositPayment = order.payments?.find((p) => p.payment_type === 'deposit')
  const depositPaid = depositPayment?.status === 'completed'
  const remainderPayment = order.payments?.find((p) => p.payment_type === 'remainder')
  const remainderPaid = remainderPayment?.status === 'completed'
  const needsRemainderPayment = depositPaid && !remainderPaid && !order.locked_at
  const extrasTotal = order.extra_products?.reduce(
    (sum: number, extra: any) => sum + (extra.total_price || 0),
    0
  ) || 0
  const baseRemainder = Math.max(0, order.remainder_amount - extrasTotal)
  const remainderTotal = Math.max(0, order.remainder_amount)
  const remainderDueDate = new Date('2026-11-16')
  const today = useMemo(() => toDateOnly(new Date()), [])
  const dueDate = toDateOnly(remainderDueDate)
  const daysToDue = daysBetween(dueDate, today)
  const daysToDueLabel = Math.max(daysToDue, 0)
  const formattedDueDate = remainderDueDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const deliveredDate = order.marked_delivered_at ? new Date(order.marked_delivered_at) : null
  const timelineDeliveryText = deliveredDate
    ? deliveredDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : order.status === 'ready_for_pickup' || order.status === 'completed'
    ? copy.estimatedReadyNow
    : copy.estimatedWeekRange
  const boxName = lang === 'no' ? order.display_box_name_no : order.display_box_name_en
  const boxLabel = boxName || t.common.defaultBoxName

  const currentExtrasForModal = useMemo(
    () => order.extra_products?.map((extra: any) => ({ slug: extra.slug, quantity: Number(extra.quantity) })) || [],
    [order.extra_products]
  )

  useEffect(() => {
    let isMounted = true
    async function loadPublicConfig() {
      try {
        const response = await fetch('/api/config', { cache: 'no-store' })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.contact || !isMounted) {
          return
        }
        setContactInfo({
          email: data.contact.email || copy.contactEmail,
          phone: data.contact.phone || copy.contactPhone,
        })
      } catch {
        // Keep fallback contact info from translations.
      }
    }

    loadPublicConfig()
    return () => {
      isMounted = false
    }
  }, [copy.contactEmail, copy.contactPhone])

  const deliveryTypeLabels: Record<string, string> = {
    pickup_farm: copy.deliveryTypePickupFarm,
    pickup_e6: copy.deliveryTypePickupE6,
    delivery_trondheim: copy.deliveryTypePickupTrondheim,
  }

  const ribbeChoiceLabels: Record<string, string> = {
    tynnribbe: copy.ribChoiceTynnribbe,
    familieribbe: copy.ribChoiceFamilieribbe,
    porchetta: copy.ribChoicePorchetta,
    butchers_choice: copy.ribChoiceButchersChoice,
  }

  const statusMeta = (() => {
    switch (order.status) {
      case 'deposit_paid':
        if (baseRemainder > 0) {
          return { label: copy.statusPaymentRemaining, className: 'bg-amber-50 text-amber-700' }
        }
        return { label: copy.statusDepositPaid, className: 'bg-emerald-50 text-emerald-700' }
      case 'paid':
        return { label: copy.statusPaid, className: 'bg-emerald-50 text-emerald-700' }
      case 'ready_for_pickup':
        return { label: copy.statusDelivered, className: 'bg-indigo-50 text-indigo-700' }
      case 'completed':
        return { label: copy.statusCompleted, className: 'bg-neutral-100 text-neutral-700' }
      case 'cancelled':
        return { label: copy.statusCancelled, className: 'bg-rose-50 text-rose-700' }
      default:
        return { label: copy.statusWaitingDeposit, className: 'bg-neutral-100 text-neutral-700' }
    }
  })()

  const growingDone = Boolean(depositPaid) || ['deposit_paid', 'paid', 'ready_for_pickup', 'completed'].includes(order.status)
  const slaughterDone = Boolean(order.locked_at) || ['paid', 'ready_for_pickup', 'completed'].includes(order.status)
  const deliveryDone = Boolean(order.marked_delivered_at) || ['completed'].includes(order.status)
  const deliveryTimelineSummary =
    order.status === 'ready_for_pickup' ? `${copy.timelinePickupPrefix} ${timelineDeliveryText}` : statusTimelineCopy.deliveryHint
  const timelineSteps = [
    {
      key: 'ordered',
      label: statusTimelineCopy.ordered,
      summary: new Date(order.created_at).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      detail: statusTimelineCopy.orderedHint,
      done: true,
    },
    {
      key: 'growing',
      label: statusTimelineCopy.growing,
      summary: growingDone ? copy.statusDepositPaid : copy.statusWaitingDeposit,
      detail: statusTimelineCopy.growingHint,
      done: growingDone,
    },
    {
      key: 'slaughter',
      label: statusTimelineCopy.slaughter,
      summary: needsRemainderPayment
        ? `${copy.dueDate}: ${formattedDueDate}${daysToDue >= 0 ? ` - ${daysToDueLabel} ${daysLeftLabel}` : ''}`
        : slaughterDone
        ? copy.timelineRemainderPaid
        : statusTimelineCopy.slaughterHint,
      detail: needsRemainderPayment
        ? `${currency} ${remainderTotal.toLocaleString(locale)}`
        : statusTimelineCopy.slaughterHint,
      done: slaughterDone,
    },
    {
      key: 'delivery',
      label: statusTimelineCopy.delivery,
      summary: deliveryDone ? `${copy.timelinePickupPrefix} ${timelineDeliveryText}` : deliveryTimelineSummary,
      detail: deliveryDone ? `${copy.timelinePickupPrefix} ${timelineDeliveryText}` : statusTimelineCopy.deliveryHint,
      done: deliveryDone,
    },
  ]

  const nextAction = (() => {
    if (order.status === 'completed') {
      return { text: copy.nextActionCompleted, tone: 'success' as const }
    }
    if (order.status === 'ready_for_pickup') {
      return { text: copy.nextActionReady, tone: 'warning' as const }
    }
    if (needsRemainderPayment) {
      return {
        text: copy.nextActionPaymentDue
          .replace('{currency}', currency)
          .replace('{amount}', remainderTotal.toLocaleString(locale)),
        tone: 'warning' as const,
      }
    }
    if (order.locked_at && !remainderPaid) {
      return { text: copy.nextActionLocked, tone: 'warning' as const }
    }
    if (!depositPaid) {
      return { text: copy.nextActionWaitingDeposit, tone: 'neutral' as const }
    }
    if (order.status === 'cancelled') {
      return { text: copy.statusCancelled, tone: 'neutral' as const }
    }
    return { text: copy.nextActionProcessing, tone: 'info' as const }
  })()

  const nextActionClass = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    neutral: 'border-neutral-200 bg-white text-neutral-700',
  }[nextAction.tone]

  async function handleAddExtras(selectedExtras: { slug: string; quantity: number }[], proceedToPayment = false) {
    setAddingExtras(true)
    setExtrasError(null)
    try {
      const response = await fetch(`/api/orders/${order.id}/add-extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extras: selectedExtras }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const message = data?.error || copy.updateError
        throw new Error(message)
      }
      const addedCount = data?.extrasAdded ?? selectedExtras.length
      toast({
        title: copy.updatedTitle,
        description: copy.updatedExtras.replace('{count}', String(addedCount)),
      })
      setShowExtrasModal(false)
      await onRefresh()

      if (proceedToPayment) {
        onPayRemainder(order.id)
      }
    } catch (error: any) {
      console.error('Error adding extras:', error)
      setExtrasError(error?.message || copy.addExtrasError)
    } finally {
      setAddingExtras(false)
    }
  }

  async function handleSaveModifications(modifications: any) {
    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modifications),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.error || copy.saveModificationsError)
    }

    setShowModificationModal(false)
    onRefresh()
  }

  async function handleReorder() {
    if (!window.confirm(copy.reorderConfirm)) return
    setReordering(true)
    try {
      const response = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      if (!response.ok) throw new Error(copy.reorderFailed)
      const data = await response.json()
      toast({
        title: copy.reorderCreatedTitle,
        description: copy.reorderCreatedDescription.replace('{orderNumber}', data.orderNumber),
      })
      onRefresh()
    } catch (error) {
      console.error('Error reordering:', error)
      toast({
        title: copy.errorTitle,
        description: copy.reorderFailed,
        variant: 'destructive',
      })
    } finally {
      setReordering(false)
    }
  }

  return (
    <>
      <Card className="p-6 border-neutral-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.minSide.order}</p>
            <h3 className="text-2xl font-normal text-neutral-900">{order.order_number}</h3>
            <p className="text-sm text-neutral-600">
              {boxLabel} - {new Date(order.created_at).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {needsRemainderPayment && (
                  <DropdownMenuItem onClick={() => onPayRemainder(order.id)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {copy.payRemainder}
                  </DropdownMenuItem>
                )}
                {!order.locked_at && canEdit && (
                  <DropdownMenuItem onClick={() => setShowModificationModal(true)}>
                    <Package className="w-4 h-4 mr-2" />
                    {copy.editOrder}
                  </DropdownMenuItem>
                )}
                {!order.locked_at && canEdit && needsRemainderPayment && (
                  <DropdownMenuItem onClick={() => setShowExtrasModal(true)}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {copy.addExtraProducts}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowPaymentHistoryModal(true)}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {copy.paymentHistory}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTimelineModal(true)}>
                  <Calendar className="w-4 h-4 mr-2" />
                  {copy.orderHistory}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowContactModal(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {copy.contactUs}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />
                  {copy.print}
                </DropdownMenuItem>
                {order.status === 'completed' && (
                  <DropdownMenuItem onClick={handleReorder} disabled={reordering}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {reordering ? copy.creatingOrder : copy.orderAgain}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.minSide.box}</p>
              <p className="text-lg font-normal text-neutral-900">{boxLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.minSide.ribbe}</p>
              <p className="text-sm text-neutral-700">{ribbeChoiceLabels[order.ribbe_choice] || order.ribbe_choice}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{copy.depositBoxLabel.replace('{box}', boxLabel)}</span>
              <span className="font-normal text-neutral-900">{currency} {order.deposit_amount.toLocaleString(locale)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{copy.boxRemainder}</span>
              <span className="font-normal text-neutral-900">{currency} {baseRemainder.toLocaleString(locale)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{copy.extraProducts}</span>
              <span className="font-normal text-neutral-900">
                {extrasTotal > 0 ? '+' : ''}{currency} {extrasTotal.toLocaleString(locale)}
              </span>
            </div>
            <div className="pt-2 mt-1 border-t border-neutral-200 flex items-center justify-between text-sm">
              <span className="text-neutral-500">{copy.remainderTotal}</span>
              <span className="font-normal text-neutral-900">{currency} {remainderTotal.toLocaleString(locale)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-neutral-600">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.minSide.delivery}</p>
              <p className="font-normal text-neutral-900">{deliveryTypeLabels[order.delivery_type] || order.delivery_type}</p>
              {order.fresh_delivery && (
                <p className="text-xs text-blue-700">{copy.freshDeliveryAddon.replace('{currency}', currency)}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <Mail className="w-4 h-4" />
              <span>{contactInfo.email}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <Phone className="w-4 h-4" />
              <span>{contactInfo.phone}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className={cn('rounded-lg border px-3 py-2 text-sm', nextActionClass)}>
            <p className="font-medium">{nextAction.text}</p>
          </div>
          <StepTimeline
            steps={timelineSteps}
            expandLabel={copy.timelineExpand}
            collapseLabel={copy.timelineCollapse}
          />
        </div>

        <div className="mt-5 pt-5 border-t border-neutral-200 flex flex-wrap gap-2">
          {needsRemainderPayment && (
            <Button onClick={() => onPayRemainder(order.id)} className="btn-primary">
              {copy.payRemainder}
            </Button>
          )}
          {!order.locked_at && canEdit && (
            <Button variant="outline" onClick={() => setShowModificationModal(true)}>
              {copy.editOrder}
            </Button>
          )}
          {!order.locked_at && canEdit && needsRemainderPayment && (
            <Button variant="outline" onClick={() => setShowExtrasModal(true)}>
              {copy.addExtraProducts}
            </Button>
          )}
        </div>
      </Card>

      <ExtrasUpsellModal
        isOpen={showExtrasModal}
        onClose={() => {
          setExtrasError(null)
          setShowExtrasModal(false)
        }}
        onConfirm={(extras) => handleAddExtras(extras)}
        currentExtras={currentExtrasForModal}
        loading={addingExtras}
        isPaymentFlow={false}
        errorMessage={extrasError}
        onClearError={() => setExtrasError(null)}
      />

      {showModificationModal && (
        <OrderModificationModal
          order={order}
          isOpen={showModificationModal}
          onClose={() => setShowModificationModal(false)}
          onSave={handleSaveModifications}
        />
      )}

      <PaymentHistoryModal
        isOpen={showPaymentHistoryModal}
        onClose={() => setShowPaymentHistoryModal(false)}
        payments={order.payments || []}
        orderNumber={order.order_number}
        extraProducts={order.extra_products}
      />

      <ContactAdminModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        orderId={order.id}
        orderNumber={order.order_number}
        orderDetails={`${copy.contactDetailsBoxSize}: ${boxLabel}
${copy.contactDetailsRibChoice}: ${ribbeChoiceLabels[order.ribbe_choice] || order.ribbe_choice}
${copy.contactDetailsDeliveryType}: ${deliveryTypeLabels[order.delivery_type] || order.delivery_type}
${copy.contactDetailsStatus}: ${order.status}
${copy.contactDetailsTotalAmount}: ${currency} ${order.total_amount.toLocaleString(locale)}`}
        contactEmail={contactInfo.email}
        contactPhone={contactInfo.phone}
      />

      <OrderTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        order={order}
      />
    </>
  )
}
