# STEP 2: UX FLOWS (PRODUCTION-READY)

**Confirmed Decisions from Step 1:**
- ✅ "View by Week" toggle on landing
- ✅ Numeric input + slider for quantity
- ✅ Temporary inventory reservation during upsell
- ✅ Admin past weeks read-only in UI

---

## FLOW 1: Landing Page → Browse

### Entry Point: Landing Page (/)

**User sees:**
- Hero section with brand message
- Browse mode toggle (default: By Breed)

```
┌─────────────────────────────────────────┐
│  Tinglumgård Rugeegg                    │
│  Klekkegg fra utvalgte raser           │
│                                         │
│  [ View by Breed ]  [ View by Week ]   │
│          ●                              │
└─────────────────────────────────────────┘
```

### Mode 1A: Browse by Breed (Default)

**Shows:**
- 4 breed cards in 2×2 grid (mobile: stacked)
- Each card shows:
  - Breed avatar (accent color circle with initial)
  - Breed name
  - Short description (1-2 lines)
  - Egg color + Annual production
  - Price per egg
  - "Min order: X eggs"
  - CTA: "Se detaljer" →

**Microcopy addition (from feedback):**
```
80 kr / egg
Delivery from 300 kr · calculated at checkout
```

**Technical:**
- Query: `SELECT * FROM breeds WHERE is_active = true`
- No inventory check needed yet
- Cards are interactive (hover lift)

### Mode 1B: Browse by Week (NEW)

**Toggle switches to week-first view:**

```
┌─────────────────────────────────────────┐
│  Uke 13 · Mandag 25. mars              │
│  ────────────────────────────────────  │
│  Ayam Cemani        18 egg tilgjengelig│
│  Jersey Giant        8 egg tilgjengelig│
│  Silverudd's Blå    12 egg tilgjengelig│
│  Cream Legbar       UTSOLGT            │
└─────────────────────────────────────────┘
```

**Technical:**
- Query: `SELECT * FROM available_weeks ORDER BY delivery_monday, breed_name`
- Group by week_number
- Show next 12 weeks
- Click breed → goes to breed detail with week pre-selected

**User value:**
- Power users who think "I want eggs next week"
- Scarcity visibility (sold-out breeds are visible but greyed)

---

## FLOW 2: Breed Detail → Week Selection

### Entry: /raser/[slug]

**User sees:**
- Left column (sticky on scroll):
  - Breed avatar (large)
  - Breed name (H1)
  - Detailed description
  - Pricing card (subtotal only, no delivery yet)
  - Characteristics grid (egg color, size, temperament, production)
  - Hatching info (incubation, temp, humidity)
  - Quality disclaimer box

- Right column (sticky):
  - "Velg leveringsuke" heading
  - Calendar-style week selector

### Week Selector Component

**Shows 12 weeks ahead:**

```
┌─────────────────────────────────────────┐
│  Uke 13 · Mandag 25. mars              │
│  24 egg tilgjengelig                   │
│  [ Velg denne uken ]                   │
└─────────────────────────────────────────┘
```

**Week card states:**
1. **Available** (green accent, clickable)
   - Shows available count
   - CTA: "Velg denne uken"

2. **Low Stock** (amber accent, clickable)
   - Shows available count
   - Badge: "Få egg igjen"
   - CTA: "Velg denne uken"

3. **Sold Out** (grey, disabled)
   - Badge: "Utsolgt"
   - No CTA

4. **Closed** (hidden from view)
   - Admin has set `is_open = false`

**Technical:**
- Query: `SELECT * FROM available_weeks WHERE breed_id = ? ORDER BY delivery_monday`
- Real-time availability (no polling needed if using Supabase realtime)

**User clicks week →**

---

## FLOW 3: Quantity Selector Modal

### Triggered: Week card clicked

**Modal opens (bottom sheet on mobile, centered on desktop):**

```
┌─────────────────────────────────────────┐
│  Ayam Cemani                       [X] │
│  Uke 13 · Mandag 25. mars              │
│                                         │
│  ℹ️ 24 egg tilgjengelig denne uken     │
│                                         │
│  Antall egg                             │
│  ┌─────┐                                │
│  │  12 │  [-] [+]                       │
│  └─────┘                                │
│  ────────●──────────────                │
│          ↑ slider (secondary)           │
│                                         │
│  12 × 80 kr = 960 kr                   │
│  + frakt beregnes i neste steg         │
│                                         │
│  [ Fortsett til levering ]             │
└─────────────────────────────────────────┘
```

**Behavior:**
- Numeric input (primary, keyboard-friendly)
- +/- buttons (mobile-friendly)
- Slider (visual feedback, secondary)
- All three sync in real-time

**Validation:**
- Min: `breed.min_order_quantity` (e.g., 6)
- Max: `MIN(week.eggs_available, breed.max_order_quantity)` (e.g., 24)
- Auto-snap to min if user types < min
- Disable +/- buttons at boundaries

**User clicks "Fortsett til levering" →**

**Technical:**
- Store in session/context:
  ```js
  {
    breed_id,
    week_inventory_id,
    quantity,
    subtotal
  }
  ```
- Navigate to `/bestill/levering`

---

## FLOW 4: Delivery Method Selection

### Entry: /bestill/levering

**User sees:**

1. **Order summary card** (top, glass card):
   - Breed avatar + name
   - Week + date
   - Quantity
   - Subtotal (no delivery fee yet)

2. **Delivery method cards** (3 options):

```
┌─────────────────────────────────────────┐
│  🏡  Henting på gården                  │
│  Tinglumgård, 7600 Levanger             │
│  Hent mandag mellom 16:00-20:00         │
│                            [GRATIS] ✓   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📦  Posten Norge                       │
│  Levering til din postkasse             │
│  Sendes mandag, ankomst onsdag-fredag   │
│                            +300 kr      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🛣️  Henting ved E6                     │
│  Møtepunkt ved E6 (nord for Trondheim)  │
│  Koordineres på SMS etter bestilling    │
│                            +300 kr      │
│  [IKKE TILGJENGELIG DENNE UKEN]  ❌     │
└─────────────────────────────────────────┘
```

**E6 Pickup conditional logic:**
- Show card always
- If `week.e6_pickup_available = false`:
  - Greyed out
  - Badge: "Ikke tilgjengelig denne uken"
  - Not clickable

**User clicks delivery method →**

**Technical:**
- Update order draft:
  ```js
  {
    ...previous,
    delivery_method: 'farm_pickup',
    delivery_fee: 0,
    total_amount: subtotal + delivery_fee,
    deposit_amount: Math.round(total_amount / 2),
    remainder_amount: total_amount - deposit_amount
  }
  ```
- Navigate to `/bestill/betaling`

---

## FLOW 5: Payment Summary & Deposit

### Entry: /bestill/betaling

**User sees:**

1. **Complete order summary:**
   - Breed info (avatar, name, week, quantity, delivery method)
   - Price breakdown:
     ```
     Subtotal       960 kr
     Frakt          300 kr
     ──────────────────────
     Totalt        1260 kr
     ```

2. **50/50 Payment split explanation:**
   ```
   ┌─────────────────────────────────────────┐
   │  1️⃣  Depositum (nå)           630 kr   │
   │      Betales med Vipps for å            │
   │      reservere eggene dine              │
   │                                         │
   │  2️⃣  Restbeløp (senere)       630 kr   │
   │      Betales 11-6 dager før             │
   │      leveringsuke via e-post lenke      │
   └─────────────────────────────────────────┘
   ```

3. **Cancellation policy box:**
   ```
   ✓ Depositum refunderes fullt ut ved
     avbestilling inntil 14 dager før
     leveringsuke. Etter dette er
     depositum ikke-refunderbart.

   Policy version: v1-2026
   ```

4. **CTA button:**
   ```
   [ Betal depositum med Vipps (630 kr) ]
   ```

**User clicks button →**

**Technical:**
1. Create order record:
   ```sql
   INSERT INTO egg_orders (
     order_number, user_id, breed_id, breed_name,
     year, week_number, delivery_monday,
     quantity, price_per_egg, subtotal,
     delivery_fee, total_amount,
     deposit_amount, remainder_amount, remainder_due_date,
     delivery_method, status, policy_version
   ) VALUES (
     'EGG-2026-001', user_id, breed_id, 'Ayam Cemani',
     2026, 13, '2026-03-25',
     12, 8000, 96000,
     30000, 126000,
     63000, 63000, '2026-03-19',
     'posten', 'pending', 'v1-2026'
   );
   ```

2. Create payment transaction:
   ```sql
   INSERT INTO payment_transactions (
     order_id, transaction_type, amount,
     payment_provider, status, is_test
   ) VALUES (
     order_id, 'deposit', 63000,
     'vipps', 'pending', false
   );
   ```

3. Initiate Vipps Checkout:
   - Redirect to Vipps with transaction_id
   - User completes payment in Vipps app/browser
   - Vipps redirects back to confirmation page

4. **Webhook handler receives payment confirmation:**
   ```sql
   -- Update order status
   UPDATE egg_orders
   SET status = 'deposit_paid', updated_at = NOW()
   WHERE id = order_id;

   -- Update transaction
   UPDATE payment_transactions
   SET status = 'completed',
       provider_transaction_id = vipps_order_id,
       provider_status = 'SALE',
       updated_at = NOW()
   WHERE id = transaction_id;

   -- ALLOCATE INVENTORY (critical step)
   UPDATE weekly_inventory
   SET eggs_allocated = eggs_allocated + 12,
       updated_at = NOW()
   WHERE id = week_inventory_id;
   ```

---

## FLOW 6: Order Confirmation

### Entry: /bestill/bekreftelse/[orderId]

**User sees:**

1. **Success header:**
   ```
   ✓ Bestilling bekreftet!
   Du vil motta en bekreftelse på e-post
   ```

2. **Order number card:**
   ```
   ORDRENUMMER
   EGG-2026-001
   ```

3. **Order details:**
   - Full summary (breed, week, quantity, delivery, pricing)
   - Payment status:
     ```
     ✓ Depositum betalt    630 kr
       Restbeløp           630 kr
     ```

4. **Timeline (NEW - reduces support emails):**
   ```
   Hva skjer nå?

   📧 Dag -11: Du mottar e-post med påminnelse
              om restbeløp

   🔔 Dag -9 til -6: Flere påminnelser sendes
                     med betalingslenke

   ⛅ Dag -4 til -1: Vi sjekker værmelding.
                     Du kontaktes hvis frost

   📦 Mandag: Eggene sendes/hentes som avtalt
   ```

5. **CTAs:**
   ```
   [ Se mine bestillinger → ]
   [ Bestill flere egg ]
   ```

**Technical:**
- Query: `SELECT * FROM egg_orders WHERE id = ? AND user_id = ?`
- Join with payment_transactions to show status

---

## FLOW 7: Remainder Payment + Upsell

### Trigger: Day -11 to Day -6 (Email reminder)

**Email contains:**
- Order summary
- Remainder amount due
- **Magic link:** `/bestill/restbetaling/[token]`

### Entry: /bestill/restbetaling/[token]

**User sees:**

1. **Order summary:**
   - Original order details
   - Remainder amount: 630 kr

2. **Upsell section (conditional):**
   ```
   ┌─────────────────────────────────────────┐
   │  Vil du ha flere egg i samme sending?  │
   │                                         │
   │  Ayam Cemani · Uke 13                  │
   │  8 egg tilgjengelig                    │
   │                                         │
   │  Antall:  [0]  [-] [+]                 │
   │           ────●─────────                │
   │                                         │
   │  +0 kr                                  │
   │                                         │
   │  ℹ️ Tilgjengelighet er midlertidig      │
   │     reservert mens du fullfører        │
   │     betalingen (9 min igjen)           │
   └─────────────────────────────────────────┘
   ```

**Upsell logic:**
- Show ONLY if `week.eggs_available > 0` for same week
- Default quantity: 0 (no upsell)
- User can add 0 to available eggs

**Inventory reservation (NEW - prevents collision):**

When page loads:
```sql
-- Create upsell record with reservation
INSERT INTO order_upsells (
  original_order_id, breed_id, week_inventory_id,
  quantity, price_per_egg, subtotal,
  status, reserved_until
) VALUES (
  order_id, breed_id, week_inventory_id,
  8, 8000, 64000,
  'reserved', NOW() + INTERVAL '10 minutes'
);
```

Background cron job (runs every minute):
```sql
-- Release expired reservations
UPDATE order_upsells
SET status = 'expired', updated_at = NOW()
WHERE status = 'reserved'
  AND reserved_until < NOW();
```

**User clicks "Betal med Vipps" →**

**Technical:**
1. Calculate total:
   ```
   remainder_amount + upsell_subtotal
   ```

2. Create payment transaction:
   ```sql
   -- Remainder payment
   INSERT INTO payment_transactions (
     order_id, transaction_type, amount,
     payment_provider, status
   ) VALUES (
     order_id, 'remainder', 63000,
     'vipps', 'pending'
   );

   -- Upsell payment (if any)
   INSERT INTO payment_transactions (
     order_id, transaction_type, amount,
     payment_provider, status
   ) VALUES (
     order_id, 'upsell', 64000,
     'vipps', 'pending'
   );
   ```

3. Initiate Vipps with combined amount

4. **Webhook handler on success:**
   ```sql
   -- Update order status
   UPDATE egg_orders
   SET status = 'fully_paid', updated_at = NOW()
   WHERE id = order_id;

   -- Confirm upsell
   UPDATE order_upsells
   SET status = 'confirmed', updated_at = NOW()
   WHERE original_order_id = order_id
     AND status = 'reserved';

   -- Allocate upsell inventory
   UPDATE weekly_inventory
   SET eggs_allocated = eggs_allocated + 8
   WHERE id = week_inventory_id;
   ```

---

## FLOW 8: My Orders / Account

### Entry: /mine-bestillinger

**User sees:**

**Filter tabs:**
```
[ Kommende ]  [ Tidligere ]
      ●
```

### Kommende (Upcoming)

**Shows orders where:**
- `delivery_monday >= TODAY`
- `status IN ('deposit_paid', 'fully_paid')`

**Each order card shows:**
```
┌─────────────────────────────────────────┐
│  [A] Ayam Cemani                        │
│  EGG-2026-001                           │
│                                         │
│  Uke 13 · Mandag 25. mars              │
│  12 egg · Posten Norge                 │
│                                         │
│  Order Timeline:                        │
│  ✓ Depositum betalt                    │
│  → Restbeløp (forfaller 19. mars)      │
│  → Klargjøres                           │
│  → Sendt                                │
│  → Levert                               │
│                                         │
│  Total: 1260 kr                         │
│  [ Betal restbeløp (630 kr) ]          │
└─────────────────────────────────────────┘
```

**Timeline states (visual progress):**
- `deposit_paid`: 1/5 complete
- `fully_paid`: 2/5 complete
- `shipped`: 4/5 complete
- `delivered`: 5/5 complete

### Tidligere (Past)

**Shows orders where:**
- `delivery_monday < TODAY`
- `status IN ('delivered', 'cancelled')`

**No CTAs, read-only view**

---

## FLOW 9: Weather Cancellation (Auto-triggered)

### Trigger: Day -4 (Sunday at 18:00)

**System checks:**
```sql
SELECT * FROM egg_orders
WHERE delivery_monday = CURRENT_DATE + INTERVAL '4 days'
  AND status = 'fully_paid';
```

For each order:
1. Query Yr.no API for frost forecast at delivery address
2. If frost risk detected → send email

**Email contains:**
```
⛅ Værvarsel for leveringsuke 13

Vi har oppdaget fare for frost ved levering.
Velg ett av følgende alternativer innen
mandag kl 00:15:

1. [ 110% kreditt ] til fremtidig bestilling
2. [ Full refusjon ] til Vipps-konto
3. [ Send likevel ] på egen risiko

Klikk for å velge:
/bestill/vaer-handling/[token]
```

### Entry: /bestill/vaer-handling/[token]

**User sees:**
- Weather warning
- 3 card options (radio select)
- Countdown timer: "X timer igjen til automatisk avbestilling"

**User selects option →**

**Technical:**
```sql
UPDATE egg_orders
SET weather_action = 'credit', -- or 'refund' or 'ship_at_risk'
    updated_at = NOW()
WHERE id = order_id;
```

**If no response by Monday 00:15:**
```sql
-- Auto-cancel
UPDATE egg_orders
SET status = 'cancelled',
    cancellation_reason = 'weather_auto_cancel',
    weather_action = 'credit',
    updated_at = NOW()
WHERE id = order_id;

-- Create credit transaction
INSERT INTO payment_transactions (
  order_id, transaction_type, amount,
  payment_provider, status
) VALUES (
  order_id, 'credit', total_amount * 1.10,
  'system', 'completed'
);

-- Release inventory
UPDATE weekly_inventory
SET eggs_allocated = eggs_allocated - quantity
WHERE breed_id = order.breed_id
  AND year = order.year
  AND week_number = order.week_number;
```

---

## ADMIN FLOWS

### Admin Week Management (/admin/uker)

**Shows calendar grid:**
```
┌─────────────────────────────────────────┐
│  Uke 13 · Mandag 25. mars              │
│                                         │
│  Ayam Cemani                            │
│  ████████░░░░░  18 / 40 (45%)          │
│  8 bestillinger · 3 venter restbeløp   │
│  [ Rediger kapasitet ] [ Lukk uke ]    │
└─────────────────────────────────────────┘
```

**Past weeks (read-only enforcement):**
```
┌─────────────────────────────────────────┐
│  Uke 12 · Mandag 18. mars [LEVERT]    │
│  ████████████████  40 / 40 (100%)      │
│  🔒 Arkivert · Kan ikke endres          │
└─────────────────────────────────────────┘
```

**Clicking "Rediger kapasitet":**
- Modal opens
- If `delivery_monday < TODAY`:
  - Show error: "Kan ikke redigere tidligere uker"
  - No save button
- Else:
  - Allow capacity edit
  - Validation: `new_capacity >= eggs_allocated`

**Clicking "Lukk uke":**
- Confirmation modal:
  ```
  ⚠️ Lukke uke 13 for Ayam Cemani?

  Dette vil:
  - Skjule uken fra nettbutikken
  - Beholde eksisterende bestillinger
  - Kan gjenåpnes senere

  [ Avbryt ]  [ Lukk uke ]
  ```

- Technical:
  ```sql
  UPDATE weekly_inventory
  SET is_open = false, updated_at = NOW()
  WHERE id = week_inventory_id;
  ```

---

## ERROR STATES & EDGE CASES

### 1. Week sold out during checkout

**Scenario:** User has quantity modal open, another user buys last eggs

**Handling:**
- When user clicks "Fortsett til levering":
  ```js
  // Re-check availability
  const week = await getWeek(week_inventory_id)
  if (week.eggs_available < quantity) {
    alert('Beklager, tilgjengeligheten har endret seg. Vennligst velg på nytt.')
    // Close modal, refresh week selector
  }
  ```

### 2. E6 pickup becomes unavailable

**Scenario:** Admin toggles E6 off while user is in checkout

**Handling:**
- Payment page re-checks:
  ```js
  if (delivery_method === 'e6_pickup' && !week.e6_pickup_available) {
    // Show error banner:
    'E6-henting er ikke lenger tilgjengelig for denne uken. Vennligst velg annen leveringsmåte.'
    // Redirect back to delivery selection
  }
  ```

### 3. Upsell reservation expires during payment

**Scenario:** User takes >10 minutes to complete Vipps

**Handling:**
- Webhook checks upsell status:
  ```sql
  SELECT status FROM order_upsells
  WHERE original_order_id = ? AND status = 'reserved';
  ```
- If expired:
  - Process remainder payment only
  - Email user: "Restbeløp betalt. Ekstra egg var dessverre utsolgt."
  - Do NOT allocate upsell inventory

### 4. Payment webhook fails

**Scenario:** Vipps sends confirmation, webhook doesn't process

**Handling:**
- Retry mechanism (Vipps best practice):
  ```js
  // Idempotent webhook handler
  const existing = await getTransaction(provider_transaction_id)
  if (existing && existing.status === 'completed') {
    return 200 // Already processed
  }
  ```

- Manual reconciliation tool in admin:
  - Shows orders with `status = 'pending'` but Vipps shows paid
  - Button: "Sync with Vipps"

---

## SUMMARY: UX FLOWS COMPLETE

**Customer flows:**
1. ✅ Landing (breed-first or week-first)
2. ✅ Breed detail + week selection
3. ✅ Quantity modal (numeric + slider)
4. ✅ Delivery selection (3 methods)
5. ✅ Payment summary + deposit
6. ✅ Order confirmation with timeline
7. ✅ Remainder payment + upsell (with reservation)
8. ✅ My orders (upcoming/past with timeline)
9. ✅ Weather cancellation (3 options)

**Admin flows:**
1. ✅ Week calendar with capacity bars
2. ✅ Past weeks read-only enforcement
3. ✅ Inline capacity editing (with validation)
4. ✅ Open/close weeks

**Error handling:**
1. ✅ Sold out during checkout
2. ✅ E6 unavailable during checkout
3. ✅ Upsell reservation expiry
4. ✅ Webhook failure recovery

---

## NEXT: STEP 3 - VISUAL SYSTEM

Once you confirm this UX flow is correct, I will create:

**STEP 3: Visual System** (no code, only constraints)
- Design tokens (spacing, radius, elevation)
- Motion rules (what animates, what doesn't)
- Color logic per breed (accent usage only)
- Glassmorphism rules (where allowed, where forbidden)
- Typography scale and line-length constraints
- Mobile vs desktop layout principles

**Please confirm:** Are these UX flows correct and complete?
