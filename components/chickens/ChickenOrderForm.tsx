'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChickenCart, type ChickenDeliveryMethod } from '@/contexts/chickens/ChickenCartContext'
import { ChickenOrderSummary, type ChickenSummaryLine } from './ChickenOrderSummary'
import { trackChickenFunnel } from '@/lib/chickens/analytics'

interface ChickenOrderSelectionLine {
  id: string
  breedId: string
  breedName: string
  breedSlug: string
  accentColor: string
  hatchId: string
  ageWeeks: number
  pricePerHen: number
  pricePerRooster: number
  sellRoosters: boolean
  maxAvailableHens: number
}

interface OrderFormProps {
  selection: {
    weekNumber: number
    year: number
    items: ChickenOrderSelectionLine[]
  }
  onClose: () => void
  onRemoveLine?: (lineId: string) => void
}

interface QuantityState {
  hens: number
  roosters: number
}

export function ChickenOrderForm({ selection, onClose, onRemoveLine }: OrderFormProps) {
  const { lang } = useLanguage()
  const cart = useChickenCart()

  const [quantitiesByLine, setQuantitiesByLine] = useState<Record<string, QuantityState>>({})
  const [deliveryMethod, setDeliveryMethod] = useState<ChickenDeliveryMethod>('farm_pickup')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)

  useEffect(() => {
    setQuantitiesByLine((prev) => {
      const next: Record<string, QuantityState> = {}
      for (const line of selection.items) {
        const previous = prev[line.id]
        const maxHens = Math.max(1, Number(line.maxAvailableHens || 1))
        const hens = Math.min(maxHens, Math.max(1, previous?.hens ?? 1))
        const roosters = Math.max(0, previous?.roosters ?? 0)
        next[line.id] = { hens, roosters }
      }
      return next
    })
  }, [selection.items])

  const selectedLines = useMemo(() => {
    return selection.items
      .map((line) => {
        const quantities = quantitiesByLine[line.id] || { hens: 1, roosters: 0 }
        const hens = Math.max(1, Math.min(line.maxAvailableHens, quantities.hens))
        const roosters = Math.max(0, quantities.roosters)
        const subtotal = (hens * line.pricePerHen) + (roosters * line.pricePerRooster)
        return {
          ...line,
          quantityHens: hens,
          quantityRoosters: roosters,
          subtotal,
        }
      })
      .filter((line) => line.quantityHens > 0)
  }, [quantitiesByLine, selection.items])

  const subtotal = selectedLines.reduce((sum, line) => sum + line.subtotal, 0)
  const deliveryFee = deliveryMethod === 'delivery_namsos_trondheim' ? 300 : 0
  const total = subtotal + deliveryFee
  const deposit = Math.round(total * 0.3)
  const remainder = total - deposit

  const totalHens = selectedLines.reduce((sum, line) => sum + line.quantityHens, 0)
  const summaryLines: ChickenSummaryLine[] = selectedLines.map((line) => ({
    id: line.id,
    breedName: line.breedName,
    accentColor: line.accentColor,
    ageWeeks: line.ageWeeks,
    quantityHens: line.quantityHens,
    quantityRoosters: line.quantityRoosters,
    pricePerHen: line.pricePerHen,
    pricePerRooster: line.pricePerRooster,
  }))

  const updateLineQuantity = (lineId: string, updater: (current: QuantityState) => QuantityState) => {
    setQuantitiesByLine((prev) => {
      const current = prev[lineId] || { hens: 1, roosters: 0 }
      return { ...prev, [lineId]: updater(current) }
    })
  }

  const handleSubmit = async () => {
    setError('')

    if (selectedLines.length === 0) {
      setError(lang === 'en' ? 'Select at least one hatch' : 'Velg minst ett kull')
      return
    }

    for (const line of selectedLines) {
      if (line.quantityHens < 1) {
        setError(lang === 'en' ? 'Each selected line must have at least 1 hen' : 'Hver valgt linje m\u00E5 ha minst 1 h\u00F8ne')
        return
      }

      if (line.quantityHens > line.maxAvailableHens) {
        setError(
          lang === 'en'
            ? `Maximum for ${line.breedName} is ${line.maxAvailableHens}`
            : `Maks for ${line.breedName} er ${line.maxAvailableHens}`
        )
        return
      }
    }

    if (!customerName.trim()) {
      setError(lang === 'en' ? 'Name is required' : 'Navn er p\u00E5krevd')
      return
    }

    if (!customerEmail.trim()) {
      setError(lang === 'en' ? 'Email is required' : 'E-post er p\u00E5krevd')
      return
    }

    trackChickenFunnel('checkout_started', {
      weekNumber: selection.weekNumber,
      year: selection.year,
      lineCount: selectedLines.length,
      quantityHens: totalHens,
      total,
      deposit,
    })

    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: selectedLines.map((line) => ({
            hatchId: line.hatchId,
            breedId: line.breedId,
            quantityHens: line.quantityHens,
            quantityRoosters: line.quantityRoosters,
          })),
          pickupYear: selection.year,
          pickupWeek: selection.weekNumber,
          deliveryMethod,
          customerName,
          customerEmail,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Checkout failed')
      }

      const data = await res.json()

      const depositRes = await fetch(`/api/chickens/orders/${data.orderId}/deposit`, { method: 'POST' })
      if (!depositRes.ok) {
        throw new Error('Failed to initiate payment')
      }

      const depositData = await depositRes.json()
      if (depositData.redirectUrl) {
        trackChickenFunnel('checkout_completed', {
          orderId: data.orderId,
          weekNumber: selection.weekNumber,
          year: selection.year,
          lineCount: selectedLines.length,
          quantityHens: totalHens,
          total,
          deposit,
        })
        cart.clearCart()
        window.location.href = depositData.redirectUrl
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-neutral-900">
          {lang === 'en'
            ? `Order - ${selectedLines.length} selected lines`
            : `Bestilling - ${selectedLines.length} valgte linjer`}
        </h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {selectedLines.map((line) => {
            const remainingHens = Math.max(0, line.maxAvailableHens - line.quantityHens)

            return (
              <div key={line.id} className="rounded-lg border border-neutral-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.accentColor }} />
                    <span className="font-medium text-neutral-900">{line.breedName}</span>
                    <span className="text-xs text-neutral-500">{lang === 'en' ? 'Age' : 'Alder'}: {line.ageWeeks}u</span>
                  </div>
                  {onRemoveLine && (
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      className="text-xs text-neutral-500 hover:text-red-600"
                    >
                      {lang === 'en' ? 'Remove' : 'Fjern'}
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>{lang === 'en' ? 'Number of hens' : 'Antall h\u00F8ner'}</Label>
                    <span className="text-xs text-neutral-500">{remainingHens} {lang === 'en' ? 'left' : 'igjen'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateLineQuantity(line.id, (current) => ({ ...current, hens: Math.max(1, current.hens - 1) }))}
                    >
                      -
                    </Button>
                    <span className="text-lg font-medium w-8 text-center">{line.quantityHens}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateLineQuantity(line.id, (current) => ({ ...current, hens: Math.min(line.maxAvailableHens, current.hens + 1) }))}
                    >
                      +
                    </Button>
                    <span className="text-sm text-neutral-500">x kr {line.pricePerHen}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {lang === 'en'
                      ? `Max available in this hatch: ${line.maxAvailableHens}`
                      : `Maks tilgjengelig i dette kullet: ${line.maxAvailableHens}`}
                  </p>
                </div>

                {line.sellRoosters && (
                  <div>
                    <Label>{lang === 'en' ? 'Number of roosters' : 'Antall haner'} ({lang === 'en' ? 'optional' : 'valgfritt'})</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateLineQuantity(line.id, (current) => ({ ...current, roosters: Math.max(0, current.roosters - 1) }))}
                      >
                        -
                      </Button>
                      <span className="text-lg font-medium w-8 text-center">{line.quantityRoosters}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateLineQuantity(line.id, (current) => ({ ...current, roosters: current.roosters + 1 }))}
                      >
                        +
                      </Button>
                      <span className="text-sm text-neutral-500">x kr {line.pricePerRooster}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div>
            <Label>{lang === 'en' ? 'Delivery method' : 'Leveringsm\u00E5te'}</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === 'farm_pickup'}
                  onChange={() => setDeliveryMethod('farm_pickup')}
                />
                <div>
                  <div className="font-medium text-sm">{lang === 'en' ? 'Farm pickup' : 'Henting p\u00E5 g\u00E5rd'}</div>
                  <div className="text-xs text-neutral-500">{lang === 'en' ? 'Free' : 'Gratis'}</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === 'delivery_namsos_trondheim'}
                  onChange={() => setDeliveryMethod('delivery_namsos_trondheim')}
                />
                <div>
                  <div className="font-medium text-sm">{lang === 'en' ? 'Delivery Namsos/Trondheim' : 'Levering Namsos/Trondheim'}</div>
                  <div className="text-xs text-neutral-500">kr 300</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <Label>{lang === 'en' ? 'Name' : 'Navn'} *</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{lang === 'en' ? 'Email' : 'E-post'} *</Label>
            <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{lang === 'en' ? 'Phone' : 'Telefon'}</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{lang === 'en' ? 'Notes' : 'Notater'}</Label>
            <textarea
              className="w-full rounded-md border p-2 text-sm mt-1"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="md:sticky md:top-24 self-start">
          <button
            type="button"
            onClick={() => setSummaryOpen((prev) => !prev)}
            className="md:hidden mb-3 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
          >
            {summaryOpen
              ? (lang === 'en' ? 'Hide summary' : 'Skjul sammendrag')
              : (lang === 'en' ? 'Show summary' : 'Vis sammendrag')}
          </button>

          <div className={`${summaryOpen ? 'block' : 'hidden'} md:block`}>
            <ChickenOrderSummary
              weekNumber={selection.weekNumber}
              year={selection.year}
              lines={summaryLines}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              deposit={deposit}
              remainder={remainder}
            />
          </div>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <Button
            className="w-full mt-4 bg-neutral-900 hover:bg-neutral-800 text-white py-3"
            onClick={handleSubmit}
            disabled={submitting || selectedLines.length === 0}
          >
            {submitting
              ? (lang === 'en' ? 'Processing...' : 'Behandler...')
              : (lang === 'en' ? 'Order with Vipps' : 'Bestill med Vipps')}
          </Button>
          <p className="text-xs text-neutral-500 text-center mt-2">
            {lang === 'en'
              ? `You pay a 30% deposit (kr ${deposit}) now. Remainder (kr ${remainder}) due before pickup.`
              : `Du betaler 30% forskudd (kr ${deposit}) n\u00E5. Rest (kr ${remainder}) betales f\u00F8r henting.`}
          </p>
        </div>
      </div>
    </div>
  )
}
