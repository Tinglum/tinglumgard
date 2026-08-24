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
import { FileText } from 'lucide-react'
import { openChickenReceipt } from '@/lib/chickens/receipt'

type ChickenOrderAddition = {
  id: string
  hatch_id?: string | null
  breed_id?: string | null
  age_weeks_at_pickup?: number | null
  quantity_hens: number
  quantity_roosters: number
  subtotal_nok: number
  price_per_hen_nok?: number | null
  price_per_rooster_nok?: number | null
  created_at?: string | null
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
    pickup_date?: string | null
    pickup_time?: string | null
    pickup_monday?: string | null
    remainder_payment_enabled?: boolean
    remainder_due_date?: string | null
    delivery_method: string
    status: string
    created_at: string
    chicken_breeds?: { name?: string; accent_color?: string } | null
    chicken_order_additions?: ChickenOrderAddition[]
    chicken_payments?: Array<{
      id?: string
      payment_type: string
      status: string
      amount_nok: number
      paid_at?: string | null
      created_at?: string | null
    }>
  }
  onPayRemainder?: (orderId: string) => void
  onPayDeposit?: (orderId: string) => void
  onRefresh?: () => Promise<void> | void
}

type AddOption = {
  key: string
  hatchId: string
  breedId: string
  breedName: string
  breedSlug: string
  ageWeeks: number
  sexed: boolean
  isCreamLegbar: boolean
  pricePerHen: number
  pricePerRooster: number
  availableHens: number
  availableRoosters: number
  quantityHens: number
  quantityRoosters: number
}

type WalkinHatch = {
  hatchId: string
  breedId: string
  breedName: string
  breedSlug: string
  hatchDate: string
  ageWeeks: number
  sexed: boolean
  isCreamLegbar: boolean
  pricePerHen: number
  pricePerRooster: number
  availableHens: number
  availableRoosters: number
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

export function ChickenOrderCard({ order, onPayRemainder, onPayDeposit, onRefresh }: ChickenOrderCardProps) {
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
  const [chosenPickupDate, setChosenPickupDate] = useState<string | null>(order.pickup_date || null)
  const [chosenPickupTime, setChosenPickupTime] = useState<string | null>(order.pickup_time || null)
  const [pendingDay, setPendingDay] = useState<string | null>(null)
  const [pickingDay, setPickingDay] = useState(false)
  const [savingPickupDay, setSavingPickupDay] = useState(false)
  const pickupTimeSlots = ['09:00', '11:00', '17:00'] as const

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
  const formatBirdLine = (hens: number, roosters: number) =>
    roosters > 0
      ? `${hens.toLocaleString(locale)} ${myOrdersCopy.hensLabel} + ${roosters.toLocaleString(locale)} ${myOrdersCopy.roostersLabel}`
      : `${hens.toLocaleString(locale)} ${myOrdersCopy.hensLabel}`

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

  const baseBirds = Number(order.quantity_hens || 0) + Number(order.quantity_roosters || 0)
  const additionsBirds = (order.chicken_order_additions || []).reduce(
    (sum, addition) => sum + Number(addition.quantity_hens || 0) + Number(addition.quantity_roosters || 0),
    0
  )
  const totalBirds = baseBirds + additionsBirds
  const quantityBreakdown =
    lang === 'en'
      ? `Base ${baseBirds} + additions ${additionsBirds} = total ${totalBirds}`
      : `Grunn ${baseBirds} + tillegg ${additionsBirds} = totalt ${totalBirds}`
  const orderDisplayLines = useMemo(() => {
    const lines: Array<{
      key: string
      label: string
      breedName: string
      quantityLabel: string
      amountNok: number
      createdAt?: string | null
      ageWeeksAtPickup?: number | null
    }> = []

    if (baseBirds > 0) {
      lines.push({
        key: 'base-order',
        label: lang === 'en' ? 'Base order' : 'Grunnbestilling',
        breedName: order.chicken_breeds?.name || common.defaultChickenName,
        quantityLabel: formatBirdLine(Number(order.quantity_hens || 0), Number(order.quantity_roosters || 0)),
        amountNok: Math.max(0, baseSubtotal),
        createdAt: order.created_at,
        ageWeeksAtPickup:
          Number.isFinite(Number(order.age_weeks_at_pickup)) && Number(order.age_weeks_at_pickup) > 0
            ? Number(order.age_weeks_at_pickup)
            : null,
      })
    }

    const pickupDate = getIsoWeekMondayDate(order.pickup_year, order.pickup_week)
    ;(order.chicken_order_additions || []).forEach((addition, index) => {
      const explicitAge =
        Number.isFinite(Number(addition.age_weeks_at_pickup)) && Number(addition.age_weeks_at_pickup) > 0
          ? Number(addition.age_weeks_at_pickup)
          : null
      const computedAge = getAgeWeeks(addition.chicken_hatches?.hatch_date || null, pickupDate)
      const ageWeeksAtPickup = explicitAge ?? (computedAge > 0 ? computedAge : null)
      const additionSubtotal =
        Number(addition.subtotal_nok || 0) > 0
          ? Number(addition.subtotal_nok || 0)
          : Number(addition.quantity_hens || 0) * Number(addition.price_per_hen_nok || order.price_per_hen_nok || 0) +
            Number(addition.quantity_roosters || 0) * Number(addition.price_per_rooster_nok || order.price_per_rooster_nok || 0)

      lines.push({
        key: addition.id || `addition-${index}`,
        label: lang === 'en' ? 'Extra chickens' : 'Ekstra kyllinger',
        breedName: addition.chicken_breeds?.name || common.defaultChickenName,
        quantityLabel: formatBirdLine(Number(addition.quantity_hens || 0), Number(addition.quantity_roosters || 0)),
        amountNok: additionSubtotal,
        createdAt: addition.created_at || null,
        ageWeeksAtPickup,
      })
    })

    return lines
  }, [
    baseBirds,
    baseSubtotal,
    common.defaultChickenName,
    formatBirdLine,
    lang,
    order.age_weeks_at_pickup,
    order.chicken_breeds?.name,
    order.chicken_order_additions,
    order.created_at,
    order.pickup_week,
    order.pickup_year,
    order.price_per_hen_nok,
    order.price_per_rooster_nok,
    order.quantity_hens,
    order.quantity_roosters,
  ])
  const breedLabel = useMemo(() => {
    const uniqueBreeds = Array.from(new Set(orderLines.map((line) => line.breedName)))
    if (uniqueBreeds.length <= 2) return uniqueBreeds.join(', ')
    return `${uniqueBreeds.slice(0, 2).join(', ')} +${uniqueBreeds.length - 2}`
  }, [orderLines])

  const completedDepositPayments = (order.chicken_payments || []).filter(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )
  const completedRemainderPayments = (order.chicken_payments || []).filter(
    (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
  )
  const depositPaid =
    completedDepositPayments.length > 0 ||
    ['deposit_paid', 'fully_paid', 'ready_for_pickup', 'picked_up'].includes(order.status)
  const remainderPaidNok = completedRemainderPayments.reduce((sum, payment) => sum + Number(payment.amount_nok || 0), 0)
  const remainderDueNok = Math.max(0, order.remainder_amount_nok - remainderPaidNok)
  const hasLaterChangeBalance = remainderDueNok > 0 && completedRemainderPayments.length > 0
  const currentBalanceLabel = hasLaterChangeBalance
    ? (lang === 'en' ? 'New changes' : 'Nye endringer')
    : (lang === 'en' ? 'Outstanding now' : 'Utestaende na')
  const payBalanceLabel =
    hasLaterChangeBalance && remainderDueNok > 0
      ? (lang === 'en' ? 'Pay changes' : 'Betal endringer')
      : myOrdersCopy.payRemainder
  const paymentHistoryRows = useMemo(() => {
    const rows: Array<{
      key: string
      label: string
      amountNok: number
      paidAt?: string | null
    }> = []

    completedDepositPayments.forEach((payment, index) => {
      rows.push({
        key: `deposit-${String(payment.id || index)}`,
        label: lang === 'en' ? 'Deposit paid' : 'Forskudd betalt',
        amountNok: Number(payment.amount_nok || 0),
        paidAt: payment.paid_at || payment.created_at || null,
      })
    })

    completedRemainderPayments.forEach((payment, index) => {
      rows.push({
        key: `remainder-${String(payment.id || index)}`,
        label: lang === 'en' ? 'Remainder paid' : 'Restbetaling betalt',
        amountNok: Number(payment.amount_nok || 0),
        paidAt: payment.paid_at || payment.created_at || null,
      })
    })

    return rows
  }, [completedDepositPayments, completedRemainderPayments, lang])
  const paymentHistoryTitle = lang === 'en' ? 'Payment history' : 'Betalingshistorikk'
  const paymentHistoryEmpty = lang === 'en' ? 'No registered payments yet.' : 'Ingen registrerte betalinger ennå.'
  const paidOnLabel = lang === 'en' ? 'paid' : 'betalt'
  const extraBalanceNote =
    hasLaterChangeBalance && completedRemainderPayments.length > 0
      ? (lang === 'en'
          ? 'The earlier remainder was already paid. The balance shown now comes from later order changes.'
          : 'Tidligere restbetaling er allerede mottatt. Belopet som star igjen kommer fra senere endringer i ordren.')
      : null

  const showPayRemainder =
    order.remainder_payment_enabled === true &&
    remainderDueNok > 0 &&
    ['deposit_paid', 'ready_for_pickup'].includes(order.status)
  const meta = statusMeta[order.status] || { label: order.status, className: 'bg-neutral-100 text-neutral-700' }
  const pickupMonday = getIsoWeekMondayDate(order.pickup_year, order.pickup_week)
  const effectivePickupDate = chosenPickupDate ? toDateOnly(chosenPickupDate) : pickupMonday
  const daysToPickup = daysBetween(effectivePickupDate, today)
  const canAddMore =
    ['deposit_paid', 'fully_paid', 'ready_for_pickup'].includes(order.status) && daysToPickup >= 0
  const daysToPickupLabel = Math.max(daysToPickup, 0)
  const pickupDateLabel = effectivePickupDate.toLocaleDateString(locale, {
    weekday: chosenPickupDate ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Generate the 7 days of the pickup week (Mon–Sun)
  const pickupWeekDays = useMemo(() => {
    const days: Array<{ date: Date; iso: string; dayName: string }> = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(pickupMonday)
      d.setUTCDate(pickupMonday.getUTCDate() + i)
      days.push({
        date: d,
        iso: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
      })
    }
    return days
  }, [pickupMonday, locale])

  const canChoosePickupDay =
    ['deposit_paid', 'fully_paid', 'ready_for_pickup'].includes(order.status) &&
    daysBetween(new Date(pickupWeekDays[pickupWeekDays.length - 1]?.date || pickupMonday), today) >= 0

  const handlePickupDaySelect = (iso: string) => {
    setPendingDay(iso)
  }

  const handlePickupTimeSelect = async (time: string) => {
    const dateToSave = pendingDay || chosenPickupDate
    if (!dateToSave) return
    setSavingPickupDay(true)
    try {
      const res = await fetch(`/api/chickens/orders/${order.id}/pickup-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupDate: dateToSave, pickupTime: time }),
      })
      if (!res.ok) throw new Error('Failed')
      setChosenPickupDate(dateToSave)
      setChosenPickupTime(time)
      setPendingDay(null)
      setPickingDay(false)
      const atLabel = myOrdersCopy.atTime || (lang === 'en' ? 'at' : 'kl.')
      toast({
        title: myOrdersCopy.pickupDaySet,
        description: `${new Date(`${dateToSave}T00:00:00`).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })} ${atLabel} ${time}`,
      })
    } catch {
      toast({ title: common.error || 'Error', variant: 'destructive' })
    } finally {
      setSavingPickupDay(false)
    }
  }
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
    depositPaid || ['deposit_paid', 'fully_paid', 'ready_for_pickup', 'picked_up'].includes(order.status)
  const remainderDone =
    remainderDueNok <= 0 || ['fully_paid', 'ready_for_pickup', 'picked_up'].includes(order.status)
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
          ? `${hasLaterChangeBalance ? currentBalanceLabel : myOrdersCopy.duePrefix} ${
              hasLaterChangeBalance ? `${common.currency} ${remainderDueNok.toLocaleString(locale)}` : dueDateLabel
            }${
              hasLaterChangeBalance && dueDateLabel ? ` - ${myOrdersCopy.duePrefix.toLowerCase()} ${dueDateLabel}` : ''
            }${
              daysToDueLabel !== null && daysToDue !== null && daysToDue >= 0
                ? ` - ${daysToDueLabel} ${myOrdersCopy.daysLeftLabel}`
                : ''
            }`
          : myOrdersCopy.remainderPaidPrefix,
      detail: remainderDone
        ? `${myOrdersCopy.remainderPaidPrefix}${
            remainderPaidNok > 0 ? ` - ${common.currency} ${remainderPaidNok.toLocaleString(locale)}` : ''
          }`
        : hasLaterChangeBalance
          ? `${currentBalanceLabel}: ${common.currency} ${remainderDueNok.toLocaleString(locale)}${
              completedRemainderPayments.length > 0
                ? ` | ${lang === 'en' ? 'Earlier remainder paid' : 'Tidligere rest betalt'}: ${common.currency} ${remainderPaidNok.toLocaleString(locale)}`
                : ''
            }`
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
        : chosenPickupDate && chosenPickupTime
        ? `${pickupDateLabel} ${myOrdersCopy.atTime || (lang === 'en' ? 'at' : 'kl.')} ${chosenPickupTime}`
        : `${myOrdersCopy.pickupPrefix} ${myOrdersCopy.weekLabel} ${order.pickup_week}`,
      detail: chosenPickupDate && chosenPickupTime
        ? `${pickupDateLabel} ${myOrdersCopy.atTime || (lang === 'en' ? 'at' : 'kl.')} ${chosenPickupTime}${
            daysToPickup >= 0 ? ` - ${daysToPickupLabel} ${myOrdersCopy.daysLeftLabel}` : ''
          }`
        : `${myOrdersCopy.weekLabel} ${order.pickup_week}, ${order.pickup_year}${
            daysToPickup >= 0 ? ` - ${myOrdersCopy.choosePickupDay}` : ''
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
    if (showPayRemainder) {
      const remainderActionText = hasLaterChangeBalance
        ? (lang === 'en'
            ? `New changes (${common.currency} ${remainderDueNok.toLocaleString(locale)}) are ready to pay on My page.`
            : `Nye endringer (${common.currency} ${remainderDueNok.toLocaleString(locale)}) er klare for betaling pa Min side.`)
        : (lang === 'en'
            ? `The remaining balance (${common.currency} ${remainderDueNok.toLocaleString(locale)}) is ready to pay on My page.`
            : `Restbetalingen (${common.currency} ${remainderDueNok.toLocaleString(locale)}) er klar for betaling pa Min side.`)
      return { text: remainderActionText, tone: 'warning' as const }
    }
    if (order.status === 'fully_paid') {
      return { text: myOrdersCopy.nextActionFullyPaid, tone: 'info' as const }
    }
    if (order.status === 'cancelled') {
      return { text: myOrdersCopy.statusCancelled, tone: 'neutral' as const }
    }
    if (order.status === 'pending') {
      return { text: myOrdersCopy.nextActionPendingDeposit, tone: 'warning' as const }
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
        const response = await fetch('/api/chickens/availability/walkin', { cache: 'no-store' })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(body?.error || myOrdersCopy.additionsLoadFailed || 'Failed to load available chickens')
        }

        const rows = Array.isArray(body) ? (body as WalkinHatch[]) : []
        const options: AddOption[] = rows
          .filter((h) => h.availableHens > 0 || h.availableRoosters > 0)
          .map((h) => ({
            key: `${h.breedId}:${h.hatchId}`,
            hatchId: h.hatchId,
            breedId: h.breedId,
            breedName: h.breedName,
            breedSlug: h.breedSlug,
            ageWeeks: h.ageWeeks,
            sexed: h.sexed,
            isCreamLegbar: h.isCreamLegbar,
            pricePerHen: h.pricePerHen,
            pricePerRooster: h.pricePerRooster,
            availableHens: h.availableHens,
            availableRoosters: h.availableRoosters,
            quantityHens: 0,
            quantityRoosters: 0,
          }))

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
    toast,
  ])

  const selectedAdditions = addOptions.filter((row) => row.quantityHens > 0 || row.quantityRoosters > 0)
  const selectedAdditionsCount = selectedAdditions.reduce((sum, row) => sum + row.quantityHens + row.quantityRoosters, 0)
  const selectedAdditionsTotal = selectedAdditions.reduce(
    (sum, row) => sum + row.quantityHens * row.pricePerHen + row.quantityRoosters * row.pricePerRooster,
    0
  )

  const updateHenQty = (key: string, quantity: number) => {
    setAddOptions((current) =>
      current.map((row) => {
        if (row.key !== key) return row
        const clamped = Math.max(0, Math.min(row.availableHens, Math.round(quantity)))
        return { ...row, quantityHens: clamped }
      })
    )
  }

  const updateRoosterQty = (key: string, quantity: number) => {
    setAddOptions((current) =>
      current.map((row) => {
        if (row.key !== key) return row
        const clamped = Math.max(0, Math.min(row.availableRoosters, Math.round(quantity)))
        return { ...row, quantityRoosters: clamped }
      })
    )
  }

  const clearAdditionsDraft = () => {
    setAddOptions((current) => current.map((row) => ({ ...row, quantityHens: 0, quantityRoosters: 0 })))
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
            quantityRoosters: row.quantityRoosters,
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
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}>
              {meta.label}
            </span>
            {(order.chicken_payments || []).some((p) => p.status === 'completed') && (
              <button
                type="button"
                onClick={() => openChickenReceipt(order, lang)}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                {lang === 'no' ? 'Kvittering' : 'Receipt'}
              </button>
            )}
          </div>
        </div>

        {order.status === 'pending' && !depositPaid && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">
              {lang === 'no'
                ? 'Bestillingen er lagt inn, men betalingen er ikke fullført'
                : 'Your order is placed, but payment is not complete'}
            </p>
            <p className="mt-1.5 text-sm text-amber-800 leading-relaxed">
              {lang === 'no'
                ? 'Vipps-betalingen gikk ikke gjennom, så kyllingene er ikke reservert ennå. De reserveres først når betalingen er fullført – fullfør betalingen under for å sikre dem.'
                : 'The Vipps payment did not go through, so your chickens are not reserved yet. They are only reserved once payment completes – finish the payment below to secure them.'}
            </p>
            {onPayDeposit && (
              <Button onClick={() => onPayDeposit(order.id)} className="btn-primary mt-4">
                {lang === 'no' ? 'Betal og reserver kyllingene' : 'Pay and reserve the chickens'}
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                {lang === 'en' ? 'Quantity' : 'Mengde'}
              </p>
              <p className="text-2xl font-normal text-neutral-900">{totalBirds}</p>
              <p className="text-xs text-neutral-500">{quantityBreakdown}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.orderLinesLabel || 'Order lines'}</p>
              <div className="mt-2 space-y-2">
                {orderDisplayLines.map((line) => (
                  <div key={line.key} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">{line.label}</p>
                        <span className="text-neutral-800">{line.breedName}</span>
                        {line.ageWeeksAtPickup !== null && (
                          <p className="text-xs text-neutral-500">
                            {myOrdersCopy.ageLabel}: {line.ageWeeksAtPickup} {myOrdersCopy.weeksLabel}
                          </p>
                        )}
                        {line.createdAt && (
                          <p className="text-xs text-neutral-500">
                            {lang === 'en' ? 'Added' : 'Lagt til'}{' '}
                            {new Date(line.createdAt).toLocaleDateString(locale, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-neutral-600">{line.quantityLabel}</p>
                        <p className="text-xs text-neutral-500">
                          {common.currency} {line.amountNok.toLocaleString(locale)}
                        </p>
                      </div>
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
              <span className="text-neutral-500">{currentBalanceLabel}</span>
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
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">{paymentHistoryTitle}</p>
              {paymentHistoryRows.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {paymentHistoryRows.map((payment) => (
                    <div key={payment.key} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="text-neutral-900">{payment.label}</p>
                        {payment.paidAt && (
                          <p className="text-xs text-neutral-500">
                            {paidOnLabel}{' '}
                            {new Date(payment.paidAt).toLocaleDateString(locale, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <p className="font-medium text-neutral-900">
                        {common.currency} {payment.amountNok.toLocaleString(locale)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">{paymentHistoryEmpty}</p>
              )}
            </div>
            {extraBalanceNote && <p className="text-xs text-neutral-500">{extraBalanceNote}</p>}
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

        {canChoosePickupDay && (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                {myOrdersCopy.pickupDay}
              </p>
              {chosenPickupDate && chosenPickupTime && !pickingDay && (
                <button
                  type="button"
                  onClick={() => { setPickingDay(true); setPendingDay(null) }}
                  className="text-xs text-neutral-500 underline hover:text-neutral-700"
                >
                  {myOrdersCopy.changePickupDay}
                </button>
              )}
            </div>

            {!chosenPickupDate || !chosenPickupTime || pickingDay ? (
              <>
                {/* Step 1: Choose day */}
                {!pendingDay && (
                  <>
                    <p className="text-sm text-neutral-600 mb-3">{myOrdersCopy.choosePickupDay}</p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {pickupWeekDays.map((day) => {
                        const isPast = day.date < today
                        const isSelected = pendingDay === day.iso || (!pendingDay && chosenPickupDate === day.iso)
                        return (
                          <button
                            key={day.iso}
                            type="button"
                            disabled={isPast || savingPickupDay}
                            onClick={() => handlePickupDaySelect(day.iso)}
                            className={cn(
                              'rounded-md border px-2 py-2 text-center text-xs transition-colors',
                              isSelected
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : isPast
                                ? 'border-neutral-100 bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100'
                            )}
                          >
                            {day.dayName}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Step 2: Choose time (after day is selected) */}
                {pendingDay && (
                  <>
                    <p className="text-sm text-neutral-600 mb-1">
                      {new Date(`${pendingDay}T00:00:00`).toLocaleDateString(locale, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-sm text-neutral-600 mb-3">
                      {myOrdersCopy.choosePickupTime || (lang === 'en' ? 'Choose pickup time' : 'Velg hentetid')}
                    </p>
                    <div className="flex gap-2">
                      {pickupTimeSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          disabled={savingPickupDay}
                          onClick={() => handlePickupTimeSelect(time)}
                          className={cn(
                            'flex-1 rounded-md border px-3 py-2 text-center text-sm transition-colors',
                            'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100'
                          )}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingDay(null)}
                      className="mt-2 text-xs text-neutral-500 underline"
                    >
                      {lang === 'en' ? 'Back' : 'Tilbake'}
                    </button>
                  </>
                )}

                {pickingDay && !pendingDay && (
                  <button
                    type="button"
                    onClick={() => setPickingDay(false)}
                    className="mt-2 text-xs text-neutral-500 underline"
                  >
                    {myOrdersCopy.timelineCollapse}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm font-normal text-neutral-900">
                {effectivePickupDate.toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })} {myOrdersCopy.atTime || (lang === 'en' ? 'at' : 'kl.')} {chosenPickupTime}
              </p>
            )}
          </div>
        )}

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

        {(!depositPaid && order.status !== 'pending' && onPayDeposit) && (
          <div className="mt-5 pt-5 border-t border-neutral-200">
            <Button className="btn-primary" onClick={() => onPayDeposit(order.id)}>
              {lang === 'no' ? 'Betal depositum' : 'Pay deposit'}
            </Button>
          </div>
        )}
        {showPayRemainder && (
          <div className="mt-5 pt-5 border-t border-neutral-200">
            <Button className="btn-primary" onClick={() => onPayRemainder?.(order.id)}>
              {payBalanceLabel}
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lang === 'no' ? 'Legg til kyllinger' : 'Add chickens'}</DialogTitle>
            <DialogDescription>
              {lang === 'no'
                ? 'Alle tilgjengelige kyllinger på gården akkurat nå.'
                : 'All chickens currently available on the farm.'}
            </DialogDescription>
          </DialogHeader>

          {loadingAddOptions ? (
            <div className="py-6 text-sm text-neutral-600">{myOrdersCopy.loading || common.loading}</div>
          ) : addOptions.length === 0 ? (
            <div className="py-6 text-sm text-neutral-600">
              {lang === 'no' ? 'Ingen kyllinger tilgjengelig akkurat nå.' : 'No chickens available right now.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {addOptions.map((row) => {
                const label = row.sexed && !row.isCreamLegbar
                  ? (lang === 'no' ? 'kjønnsbestemt' : 'sexed')
                  : row.isCreamLegbar
                    ? (lang === 'no' ? 'alltid høner' : 'always hens')
                    : (lang === 'no' ? 'ukjent kjønn' : 'unsexed')
                return (
                  <div key={row.key} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-sm font-medium text-neutral-900">{row.breedName}</span>
                        <span className="ml-2 text-xs text-neutral-400">
                          {row.ageWeeks} {lang === 'no' ? 'uker' : 'wks'} · {label}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {/* Hens / unsexed chicks */}
                      {row.availableHens > 0 && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-neutral-600 w-28">
                            {row.sexed
                              ? (lang === 'no' ? 'Høner' : 'Hens')
                              : (lang === 'no' ? 'Kyllinger' : 'Chicks')}
                            <span className="text-neutral-400 ml-1">
                              ({row.availableHens} · kr {row.pricePerHen.toLocaleString(locale)})
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => updateHenQty(row.key, row.quantityHens - 1)}
                              disabled={row.quantityHens <= 0}>−</Button>
                            <Input
                              type="number" min={0} max={row.availableHens}
                              value={row.quantityHens === 0 ? '' : row.quantityHens}
                              onChange={(e) => updateHenQty(row.key, Number(e.target.value || 0))}
                              className="w-14 text-center h-7 text-sm"
                            />
                            <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => updateHenQty(row.key, row.quantityHens + 1)}
                              disabled={row.quantityHens >= row.availableHens}>+</Button>
                          </div>
                        </div>
                      )}
                      {/* Roosters — only for sexed non-Cream-Legbar */}
                      {row.sexed && !row.isCreamLegbar && row.availableRoosters > 0 && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-neutral-600 w-28">
                            {lang === 'no' ? 'Haner' : 'Roosters'}
                            <span className="text-neutral-400 ml-1">
                              ({row.availableRoosters} · kr {row.pricePerRooster.toLocaleString(locale)})
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => updateRoosterQty(row.key, row.quantityRoosters - 1)}
                              disabled={row.quantityRoosters <= 0}>−</Button>
                            <Input
                              type="number" min={0} max={row.availableRoosters}
                              value={row.quantityRoosters === 0 ? '' : row.quantityRoosters}
                              onChange={(e) => updateRoosterQty(row.key, Number(e.target.value || 0))}
                              className="w-14 text-center h-7 text-sm"
                            />
                            <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => updateRoosterQty(row.key, row.quantityRoosters + 1)}
                              disabled={row.quantityRoosters >= row.availableRoosters}>+</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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
                disabled={savingAdditions || loadingAddOptions || selectedAdditions.length === 0}
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
