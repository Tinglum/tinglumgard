'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChickenCart, type ChickenDeliveryMethod } from '@/contexts/chickens/ChickenCartContext'
import { ChickenOrderSummary } from './ChickenOrderSummary'

interface OrderFormProps {
  selection: {
    breedId: string
    breedName: string
    breedSlug: string
    accentColor: string
    hatchId: string
    weekNumber: number
    year: number
    ageWeeks: number
    pricePerHen: number
    pricePerRooster: number
    sellRoosters: boolean
  }
  onClose: () => void
}

export function ChickenOrderForm({ selection, onClose }: OrderFormProps) {
  const { lang } = useLanguage()
  const cart = useChickenCart()

  const [quantityHens, setQuantityHens] = useState(1)
  const [quantityRoosters, setQuantityRoosters] = useState(0)
  const [deliveryMethod, setDeliveryMethod] = useState<ChickenDeliveryMethod>('farm_pickup')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const subtotal = (quantityHens * selection.pricePerHen) + (quantityRoosters * selection.pricePerRooster)
  const deliveryFee = deliveryMethod === 'delivery_namsos_trondheim' ? 300 : 0
  const total = subtotal + deliveryFee
  const deposit = Math.round(total * 0.3)
  const remainder = total - deposit

  const handleSubmit = async () => {
    setError('')
    if (quantityHens < 1) { setError(lang === 'en' ? 'Select at least 1 hen' : 'Velg minst 1 hone'); return }
    if (!customerName.trim()) { setError(lang === 'en' ? 'Name is required' : 'Navn er pakrevd'); return }
    if (!customerEmail.trim()) { setError(lang === 'en' ? 'Email is required' : 'E-post er pakrevd'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hatchId: selection.hatchId,
          breedId: selection.breedId,
          quantityHens,
          quantityRoosters,
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

      // Initiate Vipps deposit
      const depositRes = await fetch(`/api/chickens/orders/${data.orderId}/deposit`, { method: 'POST' })
      if (!depositRes.ok) {
        throw new Error('Failed to initiate payment')
      }

      const depositData = await depositRes.json()

      if (depositData.redirectUrl) {
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
          {lang === 'en' ? 'Order' : 'Bestilling'} — {selection.breedName}
        </h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>{lang === 'en' ? 'Number of hens' : 'Antall honer'}</Label>
            <div className="flex items-center gap-3 mt-1">
              <Button variant="outline" size="sm" onClick={() => setQuantityHens(Math.max(1, quantityHens - 1))}>-</Button>
              <span className="text-lg font-medium w-8 text-center">{quantityHens}</span>
              <Button variant="outline" size="sm" onClick={() => setQuantityHens(quantityHens + 1)}>+</Button>
              <span className="text-sm text-neutral-500">x kr {selection.pricePerHen}</span>
            </div>
          </div>

          {selection.sellRoosters && (
            <div>
              <Label>{lang === 'en' ? 'Number of roosters' : 'Antall haner'} ({lang === 'en' ? 'optional' : 'valgfritt'})</Label>
              <div className="flex items-center gap-3 mt-1">
                <Button variant="outline" size="sm" onClick={() => setQuantityRoosters(Math.max(0, quantityRoosters - 1))}>-</Button>
                <span className="text-lg font-medium w-8 text-center">{quantityRoosters}</span>
                <Button variant="outline" size="sm" onClick={() => setQuantityRoosters(quantityRoosters + 1)}>+</Button>
                <span className="text-sm text-neutral-500">x kr {selection.pricePerRooster}</span>
              </div>
            </div>
          )}

          <div>
            <Label>{lang === 'en' ? 'Delivery method' : 'Leveringsmate'}</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-neutral-50">
                <input type="radio" name="delivery" checked={deliveryMethod === 'farm_pickup'}
                  onChange={() => setDeliveryMethod('farm_pickup')} />
                <div>
                  <div className="font-medium text-sm">{lang === 'en' ? 'Farm pickup' : 'Henting pa gard'}</div>
                  <div className="text-xs text-neutral-500">{lang === 'en' ? 'Free' : 'Gratis'}</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-neutral-50">
                <input type="radio" name="delivery" checked={deliveryMethod === 'delivery_namsos_trondheim'}
                  onChange={() => setDeliveryMethod('delivery_namsos_trondheim')} />
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
            <textarea className="w-full rounded-md border p-2 text-sm mt-1" rows={2} value={notes}
              onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div>
          <ChickenOrderSummary
            breedName={selection.breedName}
            accentColor={selection.accentColor}
            weekNumber={selection.weekNumber}
            year={selection.year}
            ageWeeks={selection.ageWeeks}
            quantityHens={quantityHens}
            quantityRoosters={quantityRoosters}
            pricePerHen={selection.pricePerHen}
            pricePerRooster={selection.pricePerRooster}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            deposit={deposit}
            remainder={remainder}
          />

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <Button
            className="w-full mt-4 bg-neutral-900 hover:bg-neutral-800 text-white py-3"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? (lang === 'en' ? 'Processing...' : 'Behandler...')
              : (lang === 'en' ? 'Order with Vipps' : 'Bestill med Vipps')
            }
          </Button>
          <p className="text-xs text-neutral-500 text-center mt-2">
            {lang === 'en'
              ? `You pay a 30% deposit (kr ${deposit}) now. Remainder (kr ${remainder}) due before pickup.`
              : `Du betaler 30% forskudd (kr ${deposit}) na. Rest (kr ${remainder}) betales for henting.`
            }
          </p>
        </div>
      </div>
    </div>
  )
}
