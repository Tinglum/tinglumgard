# Bestill Page - Complete Changes Required

## Summary of Implementation Status

### ✅ COMPLETED:
1. **Database Migration** (`supabase/migrations/20260122_add_ribbe_and_extras_fields.sql`)
   - Added `ribbe_choice` and `extra_products` columns to orders table
   - Enhanced `extras_catalog` with pricing types, descriptions, stock
   - Seeded initial extras with proper pricing

2. **Checkout API** (`app/api/checkout/route.ts`)
   - Accepts customer name, email, phone
   - Works without authentication
   - Sends order confirmation email
   - Updates inventory automatically

3. **Email Templates** (`lib/email/templates.ts`)
   - Order confirmation template created

### 🔧 CHANGES NEEDED FOR `app/bestill/page.tsx`:

#### A. Import Changes (Lines 1-10)
Add these imports:
```typescript
import { useSearchParams } from 'next/navigation';  // ADD
import { Input } from '@/components/ui/input';      // ADD
```

#### B. State Additions (After line 24)
Add customer info state:
```typescript
const [customerName, setCustomerName] = useState('');
const [customerEmail, setCustomerEmail] = useState('');
const [customerPhone, setCustomerPhone] = useState('');
const searchParams = useSearchParams();

// URL parameter handling
useEffect(() => {
  const sizeParam = searchParams.get('size');
  if (sizeParam === '8' || sizeParam === '12') {
    setBoxSize(sizeParam);
    setStep(2);
  }
}, [searchParams]);
```

#### C. Default Ribbe Choice (Line 16)
CHANGE:
```typescript
const [ribbeChoice, setRibbeChoice] = useState<'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice' | ''>('');
```
TO:
```typescript
const [ribbeChoice, setRibbeChoice] = useState<'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice' | ''>('butchers_choice');
```

#### D. HandleCheckout Updates (Lines 26-64)
ADD validation and customer info to API call:
```typescript
async function handleCheckout() {
  // ADD THIS:
  if (!customerName || !customerEmail) {
    alert('Vennligst fyll inn navn og e-postadresse');
    return;
  }

  setIsProcessing(true);

  try {
    // ... existing code ...

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
```

#### E. Progress Steps (Around line 168)
CHANGE `{[1, 2, 3, 4].map` TO `{[1, 2, 3, 4, 5].map`

ADD 5th step label (after line 232):
```typescript
<div className="text-center w-12 md:w-24">
  <p className="text-xs font-semibold text-charcoal">Kontakt</p>
</div>
```

#### F. Ribbe Choices Update (Around line 341-346)
CHANGE the ribbe options array to:
```typescript
{[
  { id: 'tynnribbe', name: 'Tynnribbe', desc: 'Klassisk ribbe med ribbein - perfekt sprøstekt svor', tag: null },
  { id: 'familieribbe', name: 'Familieribbe', desc: 'Inkluderer kotelettkammen med ytrefileten - mer kjøtt, magrere kjøtt', tag: null },
  { id: 'porchetta', name: 'Porchetta', desc: 'Beinfri nedre mage - italiensk stil', tag: null },
  { id: 'butchers_choice', name: 'Slakterens valg', desc: 'Vi velger en god ribbe til deg basert på tilgjengelighet', tag: 'Forhåndsvalgt' },
].map((option) =>
```

#### G. Sidebar Sticky (Around line 587)
FIND:
```typescript
{/* Sidebar Summary */}
<div className="lg:col-span-1">
  <div className="glass-card-strong rounded-3xl p-10 border-2 border-white/80">
```

CHANGE TO:
```typescript
{/* Sidebar Summary - Sticky */}
<div className="lg:col-span-1">
  <div className="sticky top-24">
    <div className="glass-card-strong rounded-3xl p-10 border-2 border-white/80">
```

And add closing `</div>` before the column closes.

#### H. Add Step 5 - Customer Info (After Step 4, insert before sidebar closes)
ADD new step section:
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

#### I. Update Step 4 Button (Around line 520)
CHANGE the "Gå videre" button at end of Step 4 to proceed to step 5:
```typescript
{step === 4 && (
  <button
    onClick={() => setStep(5)}  // CHANGE FROM showing checkout to step 5
    className="mt-6 w-full px-8 py-4 bg-gradient-to-r from-charcoal to-slate text-white rounded-2xl font-bold uppercase tracking-wider hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
  >
    Gå videre til kontaktinformasjon
    <ChevronRight className="w-5 h-5" />
  </button>
)}
```

#### J. Update Checkout Button Condition (Around line 650)
CHANGE the checkout button condition to only show on step 5:
```typescript
{step === 5 && customerName && customerEmail && (
  <div className="space-y-4">
    {/* Terms checkboxes - existing code */}

    <button
      disabled={!agreedToTerms || !agreedToDepositPolicy || isProcessing}
      onClick={handleCheckout}
      className="w-full px-8 py-4 bg-gradient-to-r from-charcoal to-slate text-white rounded-2xl font-bold uppercase tracking-wider hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {isProcessing ? 'Behandler...' : 'Fullfør bestilling'}
      {!isProcessing && <ChevronRight className="w-5 h-5" />}
    </button>
  </div>
)}
```

## Priority Order for Implementation

1. **HIGHEST** - Add imports, state, and URL parameter handling
2. **HIGH** - Update handleCheckout with customer info
3. **HIGH** - Add Step 5 customer info form
4. **MEDIUM** - Update ribbe choices and defaults
5. **MEDIUM** - Make sidebar sticky
6. **LOW** - Update progress indicator to 5 steps

## Testing Checklist

After implementing:
- [ ] Navigate to `/bestill?size=8` - should pre-select 8kg
- [ ] Navigate to `/bestill?size=12` - should pre-select 12kg
- [ ] "Slakterens valg" should be pre-selected for ribbe
- [ ] Sidebar should stick when scrolling
- [ ] Step 5 should collect customer info
- [ ] Checkout should require name and email
- [ ] Order confirmation email should be sent
- [ ] Admin should see new order with customer info
