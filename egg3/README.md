# Tinglumgård Rugeegg - Nordic Minimal E-commerce Platform

A production-grade Next.js e-commerce platform for selling hatching eggs with authentic glassmorphism aesthetic and bilingual support.

## 🎯 Project Overview

Built according to comprehensive specifications from Steps 1-4:
- **Step 1**: Production-ready data model with Supabase schema
- **Step 2**: Complete UX flows with all user journeys
- **Step 3**: Nordic minimal visual system with strict design constraints
- **Step 4**: Full implementation with confirmed enhancements

## ✨ Key Features

### Core Functionality
- **Browse Modes**: Toggle between "Browse by Breed" and "Browse by Week"
- **4 Breeds**: Ayam Cemani, Jersey Giant, Silverudd's Blå, Cream Legbar
- **Weekly Inventory**: 12 weeks ahead with real-time availability
- **Quantity Selector**: Numeric input + slider (dual input method)
- **3 Delivery Methods**: Farm pickup (free), Posten (300kr), E6 pickup (300kr, conditional)
- **50/50 Payment Split**: Deposit now, remainder 11-6 days before delivery
- **Order Timeline**: Visual progress tracking with 4 stages
- **Bilingual**: Norwegian (default) + English with localStorage persistence

### Design System
- **Glassmorphism**: 3 variants (light/strong/dark) with authentic backdrop-blur
- **Breed Accents**: Restricted to borders, focus rings, badges only (<8% surface area)
- **Typography**: Space Grotesk (headings/prices only) + Inter (all UI)
- **Spacing**: Mandatory 8px grid (no arbitrary values allowed)
- **Motion**: 200ms hover, staggered reveals, respects `prefers-reduced-motion`
- **Colors**: Cool-toned neutrals with subtle accent integration

### Confirmed Enhancements (6 Critical Constraints)
1. ✅ **Accent color restriction**: Borders, badges, focus only
2. ✅ **Space Grotesk limitation**: Headings and price emphasis only
3. ✅ **Spacing discipline**: No arbitrary margins/padding
4. ✅ **Motion anti-patterns**: No continuous loops, no parallax on data views
5. ✅ **Glass-on-glass forbidden**: Single glass layer per stack
6. ✅ **Admin safety**: Confirmation + reason for inventory actions (not yet implemented)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd egg3
npm install
npm run dev
```

The application will be available at: **http://localhost:3003**

### Project Structure

```
egg3/
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                  # Landing page with browse toggle
│   ├── raser/                    # Breeds
│   │   ├── page.tsx              # Breeds overview
│   │   └── [slug]/page.tsx       # Breed detail + week selector
│   ├── bestill/                  # Checkout flow
│   │   ├── levering/page.tsx     # Delivery method selection
│   │   ├── betaling/page.tsx     # Payment summary + deposit
│   │   └── bekreftelse/[orderId]/page.tsx  # Order confirmation
│   ├── mine-bestillinger/page.tsx  # My orders with timeline
│   ├── layout.tsx                # Root layout with providers
│   └── globals.css               # Glassmorphism utilities + components
├── components/                   # Reusable components
│   ├── Header.tsx                # Sticky glass header
│   ├── GlassCard.tsx             # Glass container with variants
│   ├── WeekSelector.tsx          # Calendar-style week picker
│   └── QuantitySelector.tsx      # Modal with numeric + slider input
├── lib/                          # Core logic
│   ├── types.ts                  # TypeScript interfaces from data model
│   ├── utils.ts                  # Formatting and helper functions
│   ├── mock-data.ts              # Generated mock data (12 weeks × 4 breeds)
│   ├── language-context.tsx      # Bilingual support with localStorage
│   └── order-context.tsx         # Checkout state management
├── tailwind.config.ts            # Design tokens from Step 3
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## 📊 Data Model

Based on Step 1 production-ready schema:

### Core Tables
- `breeds` - 4 breeds with characteristics, pricing, hatching info
- `weekly_inventory` - Week-based capacity with allocation tracking
- `egg_orders` - Orders with 50/50 payment split
- `payment_transactions` - Unified payment ledger
- `order_upsells` - Remainder upsell with temporary reservation

### Key Enhancements
- `order_cutoff_date` on weekly_inventory (cleaner UX logic)
- `policy_version` on orders (legal protection)
- `is_test` on transactions (sandbox separation)
- Upsell reservation system (prevents inventory collision)

## 🎨 Visual System

### Color Palette
```
Neutrals: #fafafa to #171717 (cool-toned)
Breed Accents:
  - Ayam Cemani: #1A1A1A
  - Jersey Giant: #475569
  - Silverudd's Blå: #8B7355
  - Cream Legbar: #D4A574
Semantic: success/warning/error/info (50 bg + 700 text)
```

### Typography Scale
```
Display (Space Grotesk): Headings, prices only
Body (Inter): All UI text, labels, content
Scale: 12px → 61px (Major Third 1.25 ratio)
```

### Glassmorphism Variants
```css
.glass-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-strong {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
```

## 🔄 User Flows

### 1. Browse & Select
```
Landing → Choose mode (Breed/Week) → Select breed → View weeks → Pick week
```

### 2. Checkout
```
Quantity selector (numeric + slider) → Delivery method → Payment summary → Deposit payment → Confirmation
```

### 3. Order Management
```
My Orders → View upcoming/past → Timeline visualization → Pay remainder (when due)
```

## 🛠️ Technical Stack

- **Framework**: Next.js 14.2.0 (App Router)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 3.4 + Custom CSS
- **Animation**: Framer Motion 11
- **Icons**: Lucide React 0.363
- **Fonts**: Inter + Space Grotesk (Google Fonts)

## 📱 Responsive Design

- **Mobile**: Bottom sheets, full-width cards, touch targets 48px min
- **Desktop**: Centered modals, sticky sidebars, hover states
- **Breakpoints**: sm(640), md(768), lg(1024), xl(1280), 2xl(1536)

## ♿ Accessibility

- **WCAG AA**: 4.5:1 contrast for body text, 3:1 for large text/UI
- **Focus States**: Visible focus rings on all interactive elements
- **Screen Readers**: Semantic HTML + sr-only labels
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Touch Targets**: Minimum 44×44px (Apple HIG)

## 🌍 Internationalization

- Norwegian (default) + English
- Stored in localStorage (`tinglumgard_language`)
- All UI strings in `lib/language-context.tsx`
- Date/currency formatting via Intl API

## 💾 State Management

- **Language**: React Context + localStorage
- **Orders**: React Context + localStorage
- **Checkout Draft**: In-memory (OrderContext)
- Ready for Supabase integration (no refactoring needed)

## 🚧 Next Steps (Production)

### Phase 1: Backend Integration
1. Replace mock data with Supabase queries
2. Implement Vipps Checkout integration
3. Add Yr.no weather cancellation system
4. Set up email reminders (Day -11 to -6)

### Phase 2: Admin Dashboard
1. Week calendar view with capacity bars
2. Past weeks read-only enforcement
3. Confirmation modal for inventory changes
4. Order drill-down and management

### Phase 3: Advanced Features
1. Upsell flow during remainder payment
2. Temporary inventory reservation (10-min soft lock)
3. Weather action selection (credit/refund/ship at risk)
4. Order timeline with real-time updates

## 📄 License

Proprietary - Tinglumgård

## 📧 Contact

post@tinglumgård.no

---

**Built with precision following Steps 1-4 + 6 confirmed constraints**
