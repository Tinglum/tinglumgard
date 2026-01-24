# Implementation Guide - Bestill Page Updates

## Changes Needed for app/bestill/page.tsx

### 1. Add URL Parameter Handling (Lines 12-25)

```typescript
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // ADD THIS
import { useLanguage } from '@/contexts/LanguageContext';
// ... other imports

export default function CheckoutPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams(); // ADD THIS

  const [step, setStep] = useState(1);
  const [boxSize, setBoxSize] = useState<'8' | '12' | ''>('');
  const [ribbeChoice, setRibbeChoice] = useState<'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice' | ''>('butchers_choice'); // DEFAULT TO butchers_choice

  // ADD CUSTOMER INFO STATES
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // ADD THIS USEEFFECT FOR URL PARAMS
  useEffect(() => {
    const sizeParam = searchParams.get('size');
    if (sizeParam === '8' || sizeParam === '12') {
      setBoxSize(sizeParam);
      setStep(2); // Skip to step 2 if size is pre-selected
    }
  }, [searchParams]);
```

### 2. Update Ribbe Choices (Lines 341-347)

REPLACE the existing ribbe choices array with:

```typescript
{[
  { id: 'tynnribbe', name: 'Tynnribbe', desc: 'Klassisk ribbe med ribbein - perfekt sprøstekt svor', tag: null },
  { id: 'familieribbe', name: 'Familieribbe', desc: 'Inkluderer kotelettkammen med ytrefileten - mer kjøtt, magrere kjøtt', tag: null }, // UPDATED
  { id: 'porchetta', name: 'Porchetta', desc: 'Beinfri nedre mage - italiensk stil', tag: null },
  { id: 'butchers_choice', name: 'Slakterens valg', desc: 'Vi velger en god ribbe til deg basert på tilgjengelighet', tag: 'Forhåndsvalgt' }, // UPDATED
].map((option) => (
  // ... rest of the button code
```

### 3. Make Sidebar Sticky (Line ~550)

FIND the sidebar div (around line 587-590):
```typescript
{/* Sidebar Summary */}
<div className="lg:col-span-1">
```

REPLACE WITH:
```typescript
{/* Sidebar Summary - Sticky */}
<div className="lg:col-span-1">
  <div className="sticky top-24 space-y-6">
```

And ADD closing `</div>` before the outer `</div>` closes.

### 4. Add Customer Info Step (After Step 4, around line 580)

ADD THIS NEW STEP:

```typescript
{/* Step 5: Customer Information */}
{step >= 5 && (
  <div className={`relative bg-white/70 backdrop-blur-2xl rounded-3xl p-8 border border-white/80 shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-4 ${
    step === 5 ? 'ring-2 ring-charcoal' : ''
  }`}>
    <h2 className="text-2xl font-bold text-charcoal mb-6">5. Dine kontaktopplysninger</h2>

    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-charcoal font-semibold">Fullt navn *</Label>
        <Input
          id="name"
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Ola Nordmann"
          className="mt-2"
          required
        />
      </div>

      <div>
        <Label htmlFor="email" className="text-charcoal font-semibold">E-postadresse *</Label>
        <Input
          id="email"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="ola@example.com"
          className="mt-2"
          required
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-charcoal font-semibold">Telefonnummer</Label>
        <Input
          id="phone"
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="+47 123 45 678"
          className="mt-2"
        />
      </div>
    </div>
  </div>
)}
```

### 5. Update Progress Steps (Line ~168)

CHANGE from 4 steps to 5 steps:
```typescript
{[1, 2, 3, 4, 5].map((s) => (  // CHANGE FROM 4 TO 5
```

And UPDATE the step labels (around line 232):
```typescript
<div className="text-center w-12 md:w-24">
  <p className="text-xs font-semibold text-charcoal">Størrelse</p>
</div>
<div className="w-12 md:w-24" />
<div className="text-center w-12 md:w-24">
  <p className="text-xs font-semibold text-charcoal">Ribbe</p>
</div>
<div className="w-12 md:w-24" />
<div className="text-center w-12 md:w-24">
  <p className="text-xs font-semibold text-charcoal">Ekstra</p>
</div>
<div className="w-12 md:w-24" />
<div className="text-center w-12 md:w-24">
  <p className="text-xs font-semibold text-charcoal">Levering</p>
</div>
<div className="w-12 md:w-24" />
<div className="text-center w-12 md:w-24">
  <p className="text-xs font-semibold text-charcoal">Kontakt</p>
</div>
```

### 6. Update Delivery Step Number

FIND "4. Levering og tillegg" and UPDATE all Step 4 references to handle the button to proceed to step 5 instead of showing checkout immediately.

### 7. Update handleCheckout Function (Lines 26-64)

ADD customer info validation and include in API call:

```typescript
async function handleCheckout() {
  // Validate customer info
  if (!customerName || !customerEmail) {
    alert('Vennligst fyll inn navn og e-postadresse');
    return;
  }

  setIsProcessing(true);

  try {
    let apiDeliveryType: 'pickup_farm' | 'pickup_e6' | 'delivery_trondheim' = 'pickup_farm';
    if (deliveryType === 'e6') {
      apiDeliveryType = 'pickup_e6';
    } else if (deliveryType === 'trondheim') {
      apiDeliveryType = 'delivery_trondheim';
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boxSize: parseInt(boxSize),
        ribbeChoice,
        extraProducts,
        deliveryType: apiDeliveryType,
        freshDelivery,
        notes: '',
        customerName,    // ADD
        customerEmail,   // ADD
        customerPhone,   // ADD
      }),
    });

    const data = await response.json();

    if (data.success) {
      setOrderConfirmed(true);
      setOrderId(data.orderId);
    } else {
      alert('Noe gikk galt. Vennligst prøv igjen.');
      setIsProcessing(false);
    }
  } catch (error) {
    console.error('Checkout failed:', error);
    alert('Noe gikk galt. Vennligst prøv igjen.');
    setIsProcessing(false);
  }
}
```

### 8. Update Checkout Button Condition

FIND the checkout button section and UPDATE to only show when step === 5 and customer info is filled:

```typescript
{step === 5 && customerName && customerEmail && agreedToTerms && agreedToDepositPolicy && (
  <button
    disabled={isProcessing}
    onClick={handleCheckout}
    className="w-full px-8 py-4 bg-gradient-to-r from-charcoal to-slate text-white rounded-2xl font-bold uppercase tracking-wider hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
  >
    {isProcessing ? 'Behandler...' : 'Fullfør bestilling'}
    {!isProcessing && <ChevronRight className="w-5 h-5" />}
  </button>
)}
```

## Summary of Changes

1. ✅ Add `useSearchParams` to read `?size=8` or `?size=12`
2. ✅ Set default `ribbeChoice` to `'butchers_choice'`
3. ✅ Update ribbe choice descriptions
4. ✅ Make sidebar sticky with `position: sticky; top: 96px;`
5. ✅ Add customer info form as Step 5
6. ✅ Update progress from 4 to 5 steps
7. ✅ Update handleCheckout to include customer info
8. ✅ Add customer info validation

## Next: Extras from Database

The extras section will need to be updated to fetch from the database and show quantity/weight inputs. This requires creating an API endpoint first.
