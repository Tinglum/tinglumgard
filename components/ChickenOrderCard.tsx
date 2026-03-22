'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StepTimeline } from '@/components/orders/StepTimeline'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

type ChickenOrderAddition = {
  id: string
  hatch_id?: string | null
  breed_id?: string | null
  age_weeks_at_pickup?: number | null
  quantity_hens: number
  quantity_roosters: number
  subtotal_nok: number
  price_per_hen_nok?: number
  chicken_hatches?: { hatch_date?: string | null } | null
  chicken_breeds?: { name?: string; accent_color?: string } | null
}

interface ChickenOrderCardProps {
  order: {
    id: string
    order_number: string
    breed_id?: string | null
    quantity_hens: number
    quantity_roosters: number
    pickup_year: number
    pickup_week: number
    age_weeks_at_pickup: number
    price_per_hen_nok: number
    price_per_rooster_nok?: number
    total_amount_nok: number
    deposit_amount_nok: number
    remainder_amount_nok: number
    remainder_payment_enabled?: boolean
    remainder_due_date?: string | null
    delivery_method: string
    status: string
    created_at: string
    chicken_breeds?: { name?: string; accent_color?: string } | null
    chicken_order_additions?: ChickenOrderAddition[]
    chicken_payments?: Array<{ payment_type: string; status: string; amount_nok: number }>
  }
  onPayRemainder?: (orderId: string) => void
  onRefresh?: () => Promise<void> | void
}

type AddOption = {
  key: string
  hatchId: string
  breedId: string
  breedName: string
  ageWeeks: number
  pricePerHen: number
  availableHens: number
  quantityHens: number
}

type AvailabilityWeek = {
  weekNumber: number
  year: number
  breeds: Array<{
    breedId: string
    breedName: string
    hatches: Array<{
      hatchId: string
      ageWeeks: number
      pricePerHen: number
      availableHens: number
    }>
  }>
}

const toDateOnly = (value: string | Date) => {
  const date = new Date(value)
  return new Date(date.toISOString().split('T')[0])
}

const daysBetween = (future: Date, today: Date) => {
  const diffMs = future.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const getAgeWeeks = (hatchDate?: string | null, pickupDate?: Date | null) => {
  if (!hatchDate || !pickupDate) return 0
  const hatch = toDateOnly(hatchDate)
  const diffMs = pickupDate.getTime() - hatch.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

const getIsoWeekMondayDate = (year: number, week: number) => {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const day = simple.getUTCDay() || 7
  if (day <= 4) {
    simple.setUTCDate(simple.getUTCDate() - day + 1)
  } else {
    simple.setUTCDate(simple.getUTCDate() + 8 - day)
  }
  return toDateOnly(simple)
}

export function ChickenOrderCard({ order, onPayRemainder, onRefresh }: ChickenOrderCardProps) {
  const { lang, t } = useLanguage()
  const { toast } = useToast()
  const myOrdersCopy = (t as any).chickens.myOrders
  const common = t.common
  const locale = lang === 'en' ? 'en-US' : 'nb-NO'
  const today = useMemo(() => toDateOnly(new Date()), [])
  const [addOpen, setAddOpen] = useState(false)
  const [addOptions, setAddOptions] = useState<AddOption[]>([])
  const [loadingAddOptions, setLoadingAddOptions] = useState(false)
  const [savingAdditions, setSavingAdditions] = useState(false)

  const statusMeta: Record<string, { label: string; className: string }> = {
    pending: { label: myOrdersCopy.statusPending, className: 'bg-amber-50 text-amber-700' },
    deposit_paid: { label: myOrdersCopy.statusDepositPaid, className: 'bg-blue-50 text-blue-700' },
    fully_paid: { label: myOrdersCopy.statusFullyPaid, className: 'bg-emerald-50 text-emerald-700' },
    ready_for_pickup: { label: myOrdersCopy.statusReadyForPickup, className: 'bg-indigo-50 text-indigo-700' },
    picked_up: { label: myOrdersCopy.statusPickedUp, className: 'bg-neutral-100 text-neutral-700' },
    cancelled: { label: myOrdersCopy.statusCancelled, className: 'bg-rose-50 text-rose-700' },
  }

  const baseSubtotal =
    (Number(order.quantity_hens || 0) * Number(order.price_per_hen_nok || 0)) +
    (Number(order.quantity_roosters || 0) * Number(order.price_per_rooster_nok || 0))

  const orderLines = useMemo(() => {
    const pickupDate = getIsoWeekMondayDate(order.pickup_year, order.pickup_week)
    const grouped = new Map<
      string,
      {
        key: string
        breedName: string
        hens: number
        roosters: number
        subtotalNok: number
        ageWeeksAtPickup: number | null
      }
    >()
    const baseBreedName = order.chicken_breeds?.name || common.defaultChickenName
    const baseAge =
      Number.isFinite(Number(order.age_weeks_at_pickup)) && Number(order.age_weeks_at_pickup) > 0
        ? Number(order.age_weeks_at_pickup)
        : null
    const baseKey = `${String(order.breed_id || baseBreedName)}:${baseAge ?? 'na'}`
    grouped.set(baseKey, {
      key: baseKey,
      breedName: baseBreedName,
      hens: Number(order.quantity_hens || 0),
      roosters: Number(order.quantity_roosters || 0),
      subtotalNok: Math.max(0, baseSubtotal),
      ageWeeksAtPickup: baseAge,
    })

    for (const addition of order.chicken_order_additions || []) {
      const breedName = addition.chicken_breeds?.name || common.defaultChickenName
      const explicitAge =
        Number.isFinite(Number(addition.age_weeks_at_pickup)) && Number(addition.age_weeks_at_pickup) > 0
          ? Number(addition.age_weeks_at_pickup)
          : null
      const computedAge = getAgeWeeks(addition.chicken_hatches?.hatch_date || null, pickupDate)
      const ageWeeksAtPickup = explicitAge ?? (computedAge > 0 ? computedAge : null)
      const key = `${String(addition.breed_id || breedName || common.defaultChickenName)}:${ageWeeksAtPickup ?? 'na'}`
      const current = grouped.get(key) || {
        key,
        breedName,
        hens: 0,
        roosters: 0,
        subtotalNok: 0,
        ageWeeksAtPickup,
      }
      current.hens += Number(addition.quantity_hens || 0)
      current.roosters += Number(addition.quantity_roosters || 0)
      const additionSubtotal =
        Number(addition.subtotal_nok || 0) > 0
          ? Number(addition.subtotal_nok || 0)
          : Number(addition.quantity_hens || 0) * Number(addition.price_per_hen_nok || order.price_per_hen_nok || 0)
      current.subtotalNok += additionSubtotal
      grouped.set(key, current)
    }

    return Array.from(grouped.values())
  }, [
    baseSubtotal,
    common.defaultChickenName,
    order.chicken_breeds?.name,
    order.chicken_order_additions,
    order.age_weeks_at_pickup,
    order.pickup_week,
    order.pickup_year,
    order.price_per_hen_nok,
    order.quantity_hens,
    order.quantity_roosters,
  ])

  const uniqueAges = useMemo(() => {
    const ages = Array.from(
      new Set(
        orderLines
          .map((line) => (line.ageWeeksAtPickup !== null ? Number(line.ageWeeksAtPickup) : NaN))
          .filter((age) => Number.isFinite(age) && age > 0)
      )
    )
    ages.sort((a, b) => a - b)
    return ages
  }, [orderLines])

  const ageSummaryLabel = useMemo(() => {
    if (uniqueAges.length === 0) {
      return `${order.age_weeks_at_pickup} ${myOrdersCopy.weeksLabel}`
    }
    if (uniqueAges.length === 1) {
      return `${uniqueAges[0]} ${myOrdersCopy.weeksLabel}`
    }
    return `${uniqueAges[0]}-${uniqueAges[uniqueAges.length - 1]} ${myOrdersCopy.weeksLabel}`
  }, [myOrdersCopy.weeksLabel, order.age_weeks_at_pickup, uniqueAges])

  const totalHens = orderLines.reduce((sum, line) => sum + line.hens, 0)
  const totalRoosters = orderLines.reduce((sum, line) => sum + line.roosters, 0)
  const breedLabel = useMemo(() => {
    const uniqueBreeds = Array.from(new Set(orderLines.map((line) => line.breedName)))
    if (uniqueBreeds.length <= 2) return uniqueBreeds.join(', ')
    return `${uniqueBreeds.slice(0, 2).join(', ')} +${uniqueBreeds.length - 2}`
  }, [orderLines])

  const depositPaid = order.chicken_payments?.some(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )
  const remainderPaid = order.chicken_payments?.some(
    (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
  )
  const remainderPaidNok =
    order.chicken_payments?.reduce((sum, payment) => {
      if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
      return sum + (payment.amount_nok || 0)
    }, 0) || 0
  const remainderDueNok = Math.max(0, order.remainder_amount_nok - remainderPaidNok)

  const showPayRemainder =
    order.remainder_payment_enabled === true &&
    remainderDueNok > 0 &&
    ['deposit_paid', 'ready_for_pickup'].includes(order.status)
  const meta = statusMeta[order.status] || { label: order.status, className: 'bg-neutral-100 text-neutral-700' }
  const pickupDate = getIsoWeekMondayDate(order.pickup_year, order.pickup_week)
  const daysToPickup = daysBetween(pickupDate, today)
  const canAddMore =
    ['deposit_paid', 'fully_paid', 'ready_for_pickup'].includes(order.status) && daysToPickup >= 0
  const daysToPickupLabel = Math.max(daysToPickup, 0)
  const pickupDateLabel = pickupDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const dueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null
  const dueDateLabel = dueDate
    ? dueDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  const daysToDue = dueDate ? daysBetween(dueDate, today) : null
  const daysToDueLabel = daysToDue !== null ? Math.max(daysToDue, 0) : null
  const depositDone =
    Boolean(depositPaid) || ['deposit_paid', 'fully_paid', 'ready_for_pickup', 'picked_up'].includes(order.status)
  const remainderDone =
    Boolean(remainderPaid) || ['fully_paid', 'ready_for_pickup', 'picked_up'].includes(order.status)
  const pickupDone = ['picked_up'].includes(order.status)
  const timelineSteps = [
    {
      key: 'reserved',
      label: myOrdersCopy.stepReserved,
      summary: `${myOrdersCopy.weekLabel} ${order.pickup_week}, ${order.pickup_year}`,
      detail: `${myOrdersCopy.pickupPrefix} ${pickupDateLabel}`,
      done: true,
    },
    {
      key: 'deposit',
      label: myOrdersCopy.stepDeposit,
      summary: depositDone ? myOrdersCopy.statusDepositPaid : myOrdersCopy.statusPending,
      detail: `${myOrdersCopy.depositLabel}: ${common.currency} ${order.deposit_amount_nok.toLocaleString(locale)}`,
      done: depositDone,
    },
    {
      key: 'remainder',
      label: myOrdersCopy.stepRemainder,
      summary:
        dueDateLabel && !remainderDone
          ? `${myOrdersCopy.duePrefix} ${dueDateLabel}${
              daysToDueLabel !== null && daysToDue !== null && daysToDue >= 0
                ? ` - ${daysToDueLabel} ${myOrdersCopy.daysLeftLabel}`
                : ''
            }`
          : myOrdersCopy.remainderPaidPrefix,
      detail: remainderDone
        ? `${myOrdersCopy.remainderPaidPrefix}`
        : `${myOrdersCopy.remainderLabel}: ${common.currency} ${remainderDueNok.toLocaleString(locale)}`,
      done: remainderDone,
    },
    {
      key: 'pickup',
      label: myOrdersCopy.stepPickup,
      summary: pickupDone
        ? myOrdersCopy.statusPickedUp
        : order.status === 'ready_for_pickup'
        ? myOrdersCopy.statusReadyForPickup
        : `${myOrdersCopy.pickupPrefix} ${pickupDateLabel}`,
      detail: `${myOrdersCopy.pickupPrefix} ${pickupDateLabel}${
        daysToPickup >= 0 ? ` - ${daysToPickupLabel} ${myOrdersCopy.daysLeftLabel}` : ''
      }`,
      done: pickupDone,
    },
  ]

  const nextAction = (() => {
    if (order.status === 'picked_up') {
      return { text: myOrdersCopy.nextActionPickedUp, tone: 'success' as const }
    }
    if (order.status === 'ready_for_pickup') {
      return { text: myOrdersCopy.nextActionReadyForPickup, tone: 'warning' as const }
    }
    if (order.status === 'deposit_paid' && remainderDueNok > 0) {
      const pickupPaymentText =
        myOrdersCopy.nextActionRemainderAtPickup ||
        `Restbetaling (${common.currency} ${remainderDueNok.toLocaleString(locale)}) betales ved henting.`
      return { text: pickupPaymentText, tone: 'warning' as const }
    }
    if (order.status === 'fully_paid') {
      return { text: myOrdersCopy.nextActionFullyPaid, tone: 'info' as const }
    }
    if (order.status === 'cancelled') {
      return { text: myOrdersCopy.statusCancelled, tone: 'neutral' as const }
    }
    if (order.status === 'pending') {
      return { text: myOrdersCopy.nextActionPendingDeposit, tone: 'neutral' as const }
    }
    return { text: myOrdersCopy.nextActionProcessing, tone: 'info' as const }
  })()

  const nextActionClass = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    neutral: 'border-neutral-200 bg-white text-neutral-700',
  }[nextAction.tone]

  useEffect(() => {
    if (!addOpen) return
    let active = true

    async function loadAddOptions() {
      setLoadingAddOptions(true)
      try {
        const response = await fetch('/api/chickens/availability', { cache: 'no-store' })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(body?.error || myOrdersCopy.additionsLoadFailed || 'Failed to load available chickens')
        }

        const rows = Array.isArray(body) ? (body as AvailabilityWeek[]) : []
        const targetWeek = rows.find(
          (item) => Number(item.weekNumber) === Number(order.pickup_week) && Number(item.year) === Number(order.pickup_year)
        )

        if (!targetWeek) {
          if (active) setAddOptions([])
          return
        }

        const options: AddOption[] = []
        for (const breed of targetWeek.breeds || []) {
          for (const hatch of breed.hatches || []) {
            if (!hatch.hatchId || Number(hatch.availableHens || 0) <= 0) continue
            options.push({
              key: `${breed.breedId}:${hatch.hatchId}`,
              hatchId: hatch.hatchId,
              breedId: breed.breedId,
              breedName: breed.breedName,
              ageWeeks: Number(hatch.ageWeeks || 0),
              pricePerHen: Number(hatch.pricePerHen || 0),
              availableHens: Number(hatch.availableHens || 0),
              quantityHens: 0,
            })
          }
        }

        options.sort((a, b) => {
          const byBreed = a.breedName.localeCompare(b.breedName, locale)
          if (byBreed !== 0) return byBreed
          return a.ageWeeks - b.ageWeeks
        })

        if (active) setAddOptions(options)
      } catch (error) {
        if (!active) return
        setAddOptions([])
        toast({
          title: myOrdersCopy.additionsLoadFailedTitle || common.error,
          description:
            error instanceof Error
              ? error.message
              : myOrdersCopy.additionsLoadFailed || 'Could not load available chickens',
          variant: 'destructive',
        })
      } finally {
        if (active) setLoadingAddOptions(false)
      }
    }

    void loadAddOptions()
    return () => {
      active = false
    }
  }, [
    addOpen,
    common.error,
    locale,
    myOrdersCopy.additionsLoadFailed,
    myOrdersCopy.additionsLoadFailedTitle,
    order.pickup_week,
    order.pickup_year,
    toast,
  ])

  const selectedAdditions = addOptions.filter((row) => row.quantityHens > 0)
  const selectedAdditionsCount = selectedAdditions.reduce((sum, row) => sum + row.quantityHens, 0)
  const selectedAdditionsTotal = selectedAdditions.reduce((sum, row) => sum + row.quantityHens * row.pricePerHen, 0)

  const updateAddQuantity = (key: string, quantity: number) => {
    setAddOptions((current) =>
      current.map((row) => {
        if (row.key !== key) return row
        const clamped = Math.max(0, Math.min(row.availableHens, Math.round(quantity)))
        return { ...row, quantityHens: clamped }
      })
    )
  }

  const clearAdditionsDraft = () => {
    setAddOptions((current) => current.map((row) => ({ ...row, quantityHens: 0 })))
  }

  const handleSaveAdditions = async () => {
    if (selectedAdditions.length === 0) {
      toast({
        title: myOrdersCopy.noAdditionsSelectedTitle || common.error,
        description: myOrdersCopy.noAdditionsSelected || 'Select at least one breed to add.',
        variant: 'destructive',
      })
      return
    }

    setSavingAdditions(true)
    try {
      for (const row of selectedAdditions) {
        const response = await fetch(`/api/chickens/orders/${order.id}/additions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hatchId: row.hatchId,
            breedId: row.breedId,
            quantityHens: row.quantityHens,
            quantityRoosters: 0,
          }),
        })

        const body = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(body?.error || myOrdersCopy.additionsSaveFailed || 'Failed to save additions')
        }
      }

      toast({
        title: myOrdersCopy.additionsSavedTitle || common.save,
        description: myOrdersCopy.additionsSaved || 'Order updated successfully.',
      })

      setAddOpen(false)
      clearAdditionsDraft()
      await onRefresh?.()
    } catch (error) {
      toast({
        title: myOrdersCopy.additionsSaveFailedTitle || common.error,
        description:
          error instanceof Error ? error.message : myOrdersCopy.additionsSaveFailed || 'Failed to save additions',
        variant: 'destructive',
      })
    } finally {
      setSavingAdditions(false)
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
              {breedLabel || common.defaultChickenName} - {myOrdersCopy.weekLabel} {order.pickup_week}, {order.pickup_year}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}>
            {meta.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.hensLabel}</p>
              <p className="text-2xl font-normal text-neutral-900">{totalHens}</p>
            </div>
            {totalRoosters > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.roostersLabel}</p>
                <p className="text-lg font-normal text-neutral-900">{totalRoosters}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.orderLinesLabel || 'Order lines'}</p>
              <div className="mt-2 space-y-2">
                {orderLines.map((line) => (
                  <div key={line.key} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-neutral-800">{line.breedName}</span>
                        {line.ageWeeksAtPickup !== null && (
                          <p className="text-xs text-neutral-500">
                            {myOrdersCopy.ageLabel}: {line.ageWeeksAtPickup} {myOrdersCopy.weeksLabel}
                          </p>
                        )}
                      </div>
                      <span className="text-neutral-600">
                        {line.hens} {myOrdersCopy.hensLabel}
                        {line.roosters > 0 ? ` + ${line.roosters} ${myOrdersCopy.roostersLabel}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{myOrdersCopy.depositLabel}</span>
              <span className="font-normal text-neutral-900">
                {common.currency} {order.deposit_amount_nok.toLocaleString(locale)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{myOrdersCopy.remainderLabel}</span>
              <span className="font-normal text-neutral-900">
                {common.currency} {remainderDueNok.toLocaleString(locale)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{myOrdersCopy.totalLabel || common.total}</span>
              <span className="font-normal text-neutral-900">
                {common.currency} {Number(order.total_amount_nok || 0).toLocaleString(locale)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-neutral-600">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.ageLabel}</p>
              <p className="font-normal text-neutral-900">
                {ageSummaryLabel}
              </p>
              {uniqueAges.length > 1 && (
                <p className="text-xs text-neutral-500">
                  {lang === 'en' ? 'Multiple ages by order line' : 'Flere aldre per ordrelinje'}
                </p>
              )}
            </div>
            <div className="text-sm text-neutral-600">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.pricePerHenLabel}</p>
              <p className="font-normal text-neutral-900">{common.currency} {order.price_per_hen_nok.toLocaleString(locale)}</p>
            </div>
            {canAddMore && (
              <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
                {myOrdersCopy.addMore}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className={cn('rounded-lg border px-3 py-2 text-sm', nextActionClass)}>
            <p className="font-medium">{nextAction.text}</p>
          </div>
          <StepTimeline
            steps={timelineSteps}
            expandLabel={myOrdersCopy.timelineExpand}
            collapseLabel={myOrdersCopy.timelineCollapse}
          />
        </div>

        {showPayRemainder && (
          <div className="mt-5 pt-5 border-t border-neutral-200">
            <Button className="btn-primary" onClick={() => onPayRemainder?.(order.id)}>
              {myOrdersCopy.payRemainder}
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{myOrdersCopy.addMoreTitle || myOrdersCopy.addMore}</DialogTitle>
            <DialogDescription>
              {(myOrdersCopy.addMoreDescription || 'Pickup week {week}, {year}')
                .replace('{week}', String(order.pickup_week))
                .replace('{year}', String(order.pickup_year))}
            </DialogDescription>
          </DialogHeader>

          {loadingAddOptions ? (
            <div className="py-6 text-sm text-neutral-600">{myOrdersCopy.loading || common.loading}</div>
          ) : addOptions.length === 0 ? (
            <div className="py-6 text-sm text-neutral-600">
              {myOrdersCopy.noAdditionsAvailable || 'No additional chickens available for this pickup week.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {addOptions.map((row) => (
                <div key={row.key} className="rounded-lg border border-neutral-200 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{row.breedName}</p>
                      <p className="text-xs text-neutral-600">
                        {(myOrdersCopy.additionRowMeta || '{age} weeks - {price} each - {available} available')
                          .replace('{age}', String(row.ageWeeks))
                          .replace('{price}', `${common.currency} ${row.pricePerHen.toLocaleString(locale)}`)
                          .replace('{available}', String(row.availableHens))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateAddQuantity(row.key, row.quantityHens - 1)}
                        disabled={row.quantityHens <= 0}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        max={row.availableHens}
                        value={row.quantityHens === 0 ? '' : row.quantityHens}
                        onChange={(event) => updateAddQuantity(row.key, Number(event.target.value || 0))}
                        className="w-20 text-center"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateAddQuantity(row.key, row.quantityHens + 1)}
                        disabled={row.quantityHens >= row.availableHens}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200">
            <div className="text-sm text-neutral-700">
              {(myOrdersCopy.additionsSummary || '{count} selected - {total}')
                .replace('{count}', String(selectedAdditionsCount))
                .replace('{total}', `${common.currency} ${selectedAdditionsTotal.toLocaleString(locale)}`)}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={clearAdditionsDraft} disabled={savingAdditions}>
                {myOrdersCopy.clearAdditionsDraft || common.delete}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={savingAdditions}>
                {common.cancel}
              </Button>
              <Button
                type="button"
                onClick={handleSaveAdditions}
                disabled={savingAdditions || loadingAddOptions || addOptions.length === 0}
              >
                {savingAdditions ? myOrdersCopy.additionsSaving || common.processing : myOrdersCopy.additionsSave || common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
