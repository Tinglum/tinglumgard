# Min Side (Customer Portal) - Complete Feature List

## Overview
The "Min side" page now has comprehensive functionality for customers to manage their orders, view payment history, and communicate with the admin.

---

## ✅ Features Implemented

### 1. **Edit Order Details** ✅
**Status:** Already existed, fully functional

- **Box Size**: Change between 8kg and 12kg
- **Ribbe Choice**: Select Tynnribbe, Familieribbe, Porchetta, or Butcher's Choice
- **Hentemåte**: Switch between farm pickup, E6 pickup, or Trondheim pickup
- **Fersk henting**: Toggle between frozen and fresh pickup

**Restrictions:**
- Only available before order is locked
- Only available before cutoff date
- Price is recalculated automatically

**Location:** `components/OrderModificationModal.tsx`

---

### 2. **Add/Remove Extra Products** ✅
**Status:** Already existed, enhanced

- Browse all available extras from admin catalog
- Add products before remainder payment
- Extras added during remainder payment flow
- Shows current extras in order summary

**Restrictions:**
- Cannot modify after order is locked
- Only available with valid pricing config

**Location:** `components/ExtrasUpsellModal.tsx`

---

### 3. **View Detailed Payment History** ✅ NEW
**Status:** Newly implemented

**Features:**
- Modal showing all payments for the order
- Payment details:
  - Type (Forskudd / Restbeløp)
  - Amount paid
  - Status (Completed / Pending / Failed)
  - Payment date and time
  - Transaction ID
- Total paid summary
- Download receipt button (emails customer)

**Access:** Click "Betalingshistorikk" button in order actions

**Location:** `components/PaymentHistoryModal.tsx`

---

### 4. **Contact Admin / Request Changes** ✅ NEW
**Status:** Newly implemented

**Features:**
- Modal with message form
- Automatically includes order details
- Sends email to admin with:
  - Customer name, email, phone
  - Order number and details
  - Customer's message
- Sends confirmation email to customer
- Quick contact info (email/phone) displayed

**Use Cases:**
- Request to change delivery address
- Ask about order status
- Upgrade/downgrade box size
- Questions about box contents
- Special requests

**Access:** Click "Kontakt oss" button in order actions

**Location:**
- UI: `components/ContactAdminModal.tsx`
- API: `app/api/orders/contact/route.ts`

---

### 5. **Download Invoice/Receipt** ✅ PARTIAL
**Status:** Button exists, sends email

Currently clicking "Last ned kvittering" in payment history sends the receipt via email.

**Future Enhancement:** Could generate PDF directly in browser.

---

### 6. **Track Delivery Status** ✅
**Status:** Already existed

- Visual status badge shows current order state
- Banner shows next action required
- Estimated delivery date displayed
- Status labels:
  - Draft → Betaling gjenstår
  - Forskudd betalt → Betaling gjenstår
  - Paid → Betalt
  - Ready for Pickup → Levert
  - Completed → Fullført

**Location:** `components/OrderDetailsCard.tsx` and `components/StatusBadge.tsx`

---

### 7. **View Order Timeline/History** ✅ NEW
**Status:** Newly implemented

**Features:**
- Visual timeline with icons
- Events tracked:
  - Order created
  - Forskudd betalt
  - Order modified
  - Order locked
  - Remainder paid
  - In production
  - Ready for pickup
  - Delivered
  - At risk (payment overdue)
- Each event shows:
  - Title and description
  - Date and time
  - Status indicator
  - Color-coded by type

**Access:** Click "Ordrehistorikk" button in order actions

**Location:** `components/OrderTimelineModal.tsx`

---

### 8. **Print Order** ✅ NEW
**Status:** Newly implemented

**Features:**
- Uses browser print dialog
- Prints current order view
- Includes all order details
- Can save as PDF from print dialog

**Access:** Click "Skriv ut" button in order actions

---

### 9. **Reorder (Copy Order)** ✅
**Status:** Already existed

- Available only for completed orders
- Creates new order with same configuration
- Customer can modify before payment

**Location:** Bottom of `OrderDetailsCard`

---

## ❌ Feature NOT Implemented (By Design)

### **Cancel Order**
**Status:** Intentionally not included

**Reason:** Forskudd is non-refundable as per your business policy

**What happens instead:**
- Customers can contact admin via the contact modal to discuss issues
- Admin can manually cancel orders if needed from admin panel
- No self-service cancellation to prevent forskudd refund requests

---

## 🎨 UI/UX Improvements

### Action Buttons Grid
Clean 2x2 grid layout with:
- Payment History
- Order Timeline
- Contact Admin
- Print Order

### Consistent Modal Design
All modals follow the same pattern:
- Header with title and close button
- Main content area
- Action buttons at bottom
- Responsive and accessible

### Color Coding
- **Green**: Completed actions, success states
- **Blue**: Information, neutral actions
- **Yellow**: Pending, awaiting action
- **Red**: At risk, urgent attention needed
- **Orange**: Warnings, locked states

---

## 📁 File Structure

### New Components
```
components/
├── PaymentHistoryModal.tsx       # View all payments
├── ContactAdminModal.tsx          # Message admin
├── OrderTimelineModal.tsx         # Visual timeline
└── OrderDetailsCard.tsx           # Enhanced with new features
```

### New API Endpoints
```
app/api/orders/
└── contact/
    └── route.ts                   # Send messages to admin
```

### Existing Components (Enhanced)
```
components/
├── OrderModificationModal.tsx     # Edit order details
├── ExtrasUpsellModal.tsx          # Add extra products
└── StatusBadge.tsx                # Order status display
```

---

## 🔒 Security & Permissions

### Authentication Required
- All Min side features require Vipps login
- Users only see their own orders (matched by phone/email)
- Session expires after 30 minutes of inactivity

### Order Editing Restrictions
- Cannot edit after cutoff date
- Cannot edit after order is locked
- Price changes recalculated automatically
- Inventory checked before modifications

### Admin Notifications
- All contact messages emailed to admin
- Customer receives confirmation email
- Emails include order context

---

## 📊 Data Integrity

### Payment Amounts
- **Display**: Shows ACTUAL paid amount from Vipps (not expected)
- **Source**: `payments.amount_nok` field
- **Fallback**: Shows expected amount if not yet paid

### Order Status
- **Real-time**: Status reflects actual payment state
- **Webhook Updates**: Vipps webhook updates status automatically
- **Timeline**: All events timestamped accurately

---

## 🚀 Future Enhancements (Optional)

### Could Add:
1. **PDF Invoice Generation** - Generate PDF in browser instead of email
2. **Order Tracking Map** - Show delivery route (if doing deliveries)
3. **Photo Gallery** - Show photos of box preparation
4. **Notifications** - SMS/Email when status changes
5. **Review System** - Rate and review completed orders
6. **Favorites** - Save preferred configurations
7. **Multiple Delivery Addresses** - Manage address book
8. **Gift Orders** - Send to someone else

### Nice-to-Haves:
- Real-time order status updates (WebSocket)
- Order sharing (send link to family member)
- Subscription/recurring orders
- Loyalty program integration

---

## ✅ Testing Checklist

- [ ] View order list (shows correct orders for logged-in user)
- [ ] Open order details
- [ ] Click "Betalingshistorikk" → See all payments
- [ ] Click "Ordrehistorikk" → See timeline
- [ ] Click "Kontakt oss" → Send message
- [ ] Click "Skriv ut" → Print dialog opens
- [ ] Click "Endre bestilling" → Modify order (if not locked)
- [ ] Click "Legg til ekstra produkter" → Add extras
- [ ] Click "Betal restbeløp" → Shows extras modal first, then payment
- [ ] Verify emails sent when contacting admin
- [ ] Verify amounts display correctly (actual vs expected)
- [ ] Verify timeline shows all events in correct order
- [ ] Test on mobile (responsive)
- [ ] Test with locked order (edit button disabled)
- [ ] Test with completed order (reorder button appears)

---

## 📝 Notes

- All features respect the order lock system
- Deposit is shown as non-refundable (no cancel button)
- Contact admin is the way to request special changes
- Print functionality uses browser's native print
- All modals are accessible with keyboard navigation
- Color scheme matches the main site theme

