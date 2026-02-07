# Nordic Celebration Design System
## Premium Mangalitsa Farm E-Commerce

---

## 🎯 Design Philosophy: "Nordic Celebration"

**Core Concept**: This isn't minimalist restraint - it's the warm anticipation of holiday traditions, the rich satisfaction of premium artisan food, and the joyful energy of Norwegian Christmas markets. Think: candlelit farmhouse dinners, crackling fires, golden-hour winter light, and the excitement of opening something truly special.

**Emotional Journey**:
- **Discovery** → Curiosity and warmth
- **Exploration** → Building anticipation and appetite
- **Decision** → Confident excitement
- **Purchase** → Celebration and satisfaction

**NOT**: Corporate, sterile, apologetic, grey, corporate minimalism
**YES**: Warm, inviting, confident, alive, premium celebration

---

## 🎨 Color Palette: "Winter Hearth"

### Primary Colors
```css
/* Warm Terra Cotta - The hero color (reminds of premium meat, warmth, earth) */
--terra-cotta: #D4572E;
--terra-cotta-light: #E67A53;
--terra-cotta-dark: #B43E1A;

/* Rich Burgundy - Deep, luxurious accent */
--burgundy: #8B2635;
--burgundy-light: #A63D4D;
--burgundy-dark: #6B1726;

/* Golden Wheat - Warmth and harvest */
--golden: #E8B862;
--golden-light: #F5D494;
--golden-dark: #D4A03D;

/* Forest Green - Natural, Nordic forests */
--forest: #2C5F4A;
--forest-light: #3D7A61;
--forest-dark: #1E4434;
```

### Neutral Palette (Warm, Not Grey)
```css
/* Cream base - Warmer than white */
--cream: #FAF7F2;
--cream-dark: #F2EDE3;

/* Warm Stone - Replace neutral-200 */
--stone: #E8DFD2;
--stone-dark: #D4C9B8;

/* Charcoal - Deep, warm black with brown undertones */
--charcoal: #2B2520;
--charcoal-light: #3D3530;

/* Warm Grey - For secondary text */
--warm-grey: #6B6158;
--warm-grey-light: #8A7F73;
```

### Accent Colors
```css
/* Pine - For success states, fresh delivery */
--pine: #4A7856;

/* Amber - Alerts, limited time */
--amber: #E89C2E;

/* Snow - Subtle backgrounds */
--snow: #FFFFFF;
--snow-warm: #FFFBF5;
```

### Usage Rules
- **Primary Actions**: Terra cotta (order buttons, CTAs)
- **Backgrounds**: Cream and snow-warm (never pure white)
- **Text**: Charcoal for primary, warm-grey for secondary
- **Accents**: Golden for highlights, burgundy for premium badges
- **Borders**: Stone and stone-dark (warmer than grey borders)

---

## ✍️ Typography: "Heritage & Warmth"

### Font Stack

**Display Font - Fraunces (Variable)**
```css
font-family: 'Fraunces', serif;
```
- A warm, slightly eccentric serif with "soft" optical sizing
- Use for: Page titles, product names, emotional headlines
- Variable axes: Use "soft" variants for warmth (opsz: 9-144, SOFT: 0-100)
- Download: Google Fonts

**Body Font - Karla (Sans-serif)**
```css
font-family: 'Karla', sans-serif;
```
- Warm, friendly, highly readable sans-serif
- Use for: Body text, descriptions, UI elements
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Accent Font - DM Mono (Monospace)**
```css
font-family: 'DM Mono', monospace;
```
- Use for: Prices, order numbers, technical details
- Creates pleasing contrast and clarity for numbers

### Typography Scale
```css
/* Headings */
--text-6xl: 3.75rem;  /* 60px - Hero titles */
--text-5xl: 3rem;     /* 48px - Page titles */
--text-4xl: 2.25rem;  /* 36px - Section titles */
--text-3xl: 1.875rem; /* 30px - Card titles */
--text-2xl: 1.5rem;   /* 24px - Subheadings */
--text-xl: 1.25rem;   /* 20px - Large body */

/* Body */
--text-base: 1rem;      /* 16px - Body text */
--text-sm: 0.875rem;    /* 14px - Small text */
--text-xs: 0.75rem;     /* 12px - Labels */

/* Line Heights */
--leading-tight: 1.1;
--leading-snug: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Typography Rules
1. **Headlines**: Fraunces, 700 weight, tight leading (1.1-1.25)
2. **Body**: Karla, 400 weight, relaxed leading (1.75)
3. **Prices**: DM Mono, tabular-nums, medium weight (500)
4. **Labels/Meta**: Karla, 600 weight, uppercase, wide tracking (0.08em)

---

## 📏 Spacing & Rhythm: "Generous & Warm"

### Spacing Scale (8px base)
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

### Layout Rules
- **Section Padding**: 80-128px vertical (space-20 to space-32)
- **Card Padding**: 32-48px (space-8 to space-12)
- **Content Max Width**: 1200px (but allow heroes to be wider)
- **Generous White Space**: Use space-12 to space-20 between major sections

---

## 🎭 Component Design Patterns

### 1. Product Cards - "Warm Window"
```
┌─────────────────────────────────┐
│                                 │
│   [Warm gradient background]    │  ← Golden to terra cotta gradient
│                                 │
│   MOST POPULAR                  │  ← Badge (burgundy bg, cream text)
│                                 │
│   12 kg                         │  ← Fraunces, 900 weight, 72px
│   Juleboks                      │  ← Fraunces, 24px
│                                 │
│   7,990 kr                      │  ← DM Mono, 32px, tabular
│   ────────────                  │
│   Deposit: 3,995 kr             │  ← Small, warm-grey
│                                 │
│   • 3 kg ribbe                  │
│   • Premium cuts                │  ← Warm-grey text, golden bullets
│   • Butcher's selection         │
│                                 │
│   [BESTILL NÅ]                  │  ← Terra cotta button, uppercase
│                                 │
└─────────────────────────────────┘
```

**CSS Properties:**
- Border: 2px solid stone (with shadow on hover)
- Border Radius: 12px (rounded-xl)
- Background: Warm gradient (golden-light to cream)
- Shadow: 0 4px 16px rgba(212, 87, 46, 0.1)
- Hover: Lift (translateY(-4px)) + stronger shadow

### 2. CTA Buttons - "Confident & Warm"
```css
/* Primary CTA */
.btn-primary {
  background: linear-gradient(135deg, var(--terra-cotta) 0%, var(--burgundy) 100%);
  color: var(--cream);
  padding: 16px 32px;
  border-radius: 8px;
  font-family: 'Karla', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  box-shadow: 0 4px 12px rgba(212, 87, 46, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(212, 87, 46, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}
```

### 3. Progress Stepper - "Journey Visualization"
```
┌───────────────────────────────────────────┐
│                                           │
│    (1)━━━━━(2)━━━━━(3)━━━━━(4)           │  ← Filled terra cotta line
│     ✓      ✓      •      ○               │
│                                           │
│   Størrelse  Ribbe  Tillegg  Levering    │
│                                           │
└───────────────────────────────────────────┘
```

**Design:**
- Active: Terra cotta circle, checkmark
- Completed: Golden circle, checkmark
- Upcoming: Stone circle, number
- Connecting line: Gradient (completed: golden, active: terra cotta, upcoming: stone)

### 4. Input Fields - "Warm & Inviting"
```css
.input {
  background: var(--snow-warm);
  border: 2px solid var(--stone);
  border-radius: 8px;
  padding: 14px 16px;
  font-family: 'Karla', sans-serif;
  font-size: 1rem;
  color: var(--charcoal);
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--terra-cotta);
  box-shadow: 0 0 0 4px rgba(212, 87, 46, 0.1);
}
```

### 5. Product Details Card - "Rich Content"
```
┌─────────────────────────────────────┐
│ INNHOLD I BOKSEN            [icon]  │  ← Uppercase, warm-grey
│ ─────────────────────────────────── │
│                                     │
│ • 2 kg ribbe (slakterens valg)      │  ← Golden bullets
│ • 1 kg nakkekoteletter              │
│ • 800g julepølse                    │
│ • 600g svinesteik                   │
│                                     │
└─────────────────────────────────────┘
```

**Design:**
- Background: Cream with subtle noise texture
- Border: 2px solid stone-dark
- Border Radius: 12px
- Bullets: Custom golden circles (not default dots)

---

## ✨ Interactions & Motion

### Animation Principles
1. **Staggered Reveals**: Products fade in with 100ms delays
2. **Confident Motion**: Use cubic-bezier(0.4, 0, 0.2, 1) for smooth, assured transitions
3. **Micro-celebrations**: Success states get a subtle "pop" scale animation
4. **Hover Elevation**: Cards lift 4-8px with stronger shadows

### Key Animations

**Page Load - Hero**
```css
@keyframes hero-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-content {
  animation: hero-fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Product Cards - Staggered**
```css
.product-card {
  opacity: 0;
  animation: fade-slide-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.product-card:nth-child(1) { animation-delay: 0ms; }
.product-card:nth-child(2) { animation-delay: 100ms; }
.product-card:nth-child(3) { animation-delay: 200ms; }

@keyframes fade-slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Button Press - Celebration**
```css
.btn-primary:active {
  animation: button-press 0.3s ease;
}

@keyframes button-press {
  0% { transform: scale(1); }
  50% { transform: scale(0.96); }
  100% { transform: scale(1); }
}
```

**Success Checkmark - Pop**
```css
@keyframes success-pop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.success-icon {
  animation: success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 🎨 Background Patterns & Textures

### 1. Subtle Noise Texture
```css
.textured-bg {
  background: var(--cream);
  position: relative;
}

.textured-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
}
```

### 2. Warm Gradient Overlays
```css
/* Hero gradient */
.hero-gradient {
  background: linear-gradient(
    135deg,
    var(--cream) 0%,
    var(--snow-warm) 50%,
    rgba(232, 184, 98, 0.1) 100%
  );
}

/* Product card gradient */
.card-gradient {
  background: linear-gradient(
    180deg,
    rgba(232, 184, 98, 0.15) 0%,
    transparent 100%
  );
}
```

### 3. Decorative Elements
```css
/* Golden accent line */
.accent-line {
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, var(--golden), var(--golden-light));
  border-radius: 2px;
}

/* Corner decoration */
.corner-accent {
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, transparent 50%, var(--golden-light) 50%);
  opacity: 0.3;
  border-radius: 0 12px 0 0;
}
```

---

## 📱 Responsive Behavior

### Breakpoints
```css
--mobile: 640px;
--tablet: 768px;
--desktop: 1024px;
--wide: 1280px;
```

### Mobile Adjustments
- Typography: Scale down by 20% (3rem → 2.4rem for h1)
- Spacing: Reduce by 25% (80px → 60px section padding)
- Cards: Stack vertically, full width
- Maintain warmth and energy (don't strip decoration on mobile)

---

## 🎯 Component Library

### Badges
```html
<span class="badge badge-popular">Mest populær</span>
<span class="badge badge-limited">Begrenset antall</span>
<span class="badge badge-new">Nyhet</span>
```

```css
.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: 'Karla', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.badge-popular {
  background: linear-gradient(135deg, var(--burgundy), var(--burgundy-dark));
  color: var(--cream);
}

.badge-limited {
  background: var(--amber);
  color: var(--charcoal);
}

.badge-new {
  background: var(--forest);
  color: var(--cream);
}
```

### Price Display
```html
<div class="price-display">
  <span class="price-value">7,990</span>
  <span class="price-currency">kr</span>
  <div class="price-divider"></div>
  <p class="price-detail">Forskudd: 3,995 kr</p>
</div>
```

```css
.price-display {
  text-align: center;
}

.price-value {
  font-family: 'DM Mono', monospace;
  font-size: 2rem;
  font-weight: 500;
  color: var(--charcoal);
  font-variant-numeric: tabular-nums;
}

.price-currency {
  font-family: 'DM Mono', monospace;
  font-size: 1.25rem;
  color: var(--warm-grey);
  margin-left: 4px;
}

.price-divider {
  width: 100px;
  height: 2px;
  background: var(--golden);
  margin: 12px auto;
}

.price-detail {
  font-size: 0.875rem;
  color: var(--warm-grey);
}
```

### Icon System
- Use outlined, warm icons (not sharp/cold)
- Stroke width: 1.5-2px
- Color: Warm-grey for inactive, terra-cotta for active
- Consider: Lucide icons or Phosphor icons (outline variant)

---

## 🔥 Special Effects

### 1. Hover Glow on Cards
```css
.product-card {
  position: relative;
  transition: all 0.3s ease;
}

.product-card::after {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, var(--golden-light), var(--terra-cotta-light));
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.product-card:hover::after {
  opacity: 0.3;
}
```

### 2. Warm Shadow System
```css
--shadow-sm: 0 2px 8px rgba(212, 87, 46, 0.08);
--shadow-md: 0 4px 16px rgba(212, 87, 46, 0.12);
--shadow-lg: 0 8px 24px rgba(212, 87, 46, 0.16);
--shadow-xl: 0 12px 40px rgba(212, 87, 46, 0.2);
```

### 3. Loading States - Warm Shimmer
```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.loading-shimmer {
  background: linear-gradient(
    90deg,
    var(--stone) 0%,
    var(--stone-dark) 50%,
    var(--stone) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

---

## 🎊 Emotional Touchpoints

### Success States
- **Color**: Pine green with golden accents
- **Animation**: Gentle bounce + confetti-like sparkles
- **Copy**: "Gratulerer! Din juleboks er bestilt 🎉"

### Error States
- **Color**: Terra cotta (not aggressive red)
- **Animation**: Gentle shake
- **Copy**: Warm, helpful language (not technical)

### Loading States
- **Animation**: Pulsing golden circle
- **Copy**: "Forbereder din bestilling..." (Building anticipation)

### Empty States
- **Illustration**: Simple, warm line art
- **Copy**: Inviting, not disappointing

---

## 📋 Implementation Checklist

### CSS Variables Setup
```css
:root {
  /* Colors */
  --terra-cotta: #D4572E;
  --burgundy: #8B2635;
  --golden: #E8B862;
  --forest: #2C5F4A;
  --cream: #FAF7F2;
  --charcoal: #2B2520;
  --warm-grey: #6B6158;
  --stone: #E8DFD2;

  /* Typography */
  --font-display: 'Fraunces', serif;
  --font-body: 'Karla', sans-serif;
  --font-mono: 'DM Mono', monospace;

  /* Spacing */
  --space-unit: 8px;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(212, 87, 46, 0.08);
  --shadow-md: 0 4px 16px rgba(212, 87, 46, 0.12);
  --shadow-lg: 0 8px 24px rgba(212, 87, 46, 0.16);

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Transitions */
  --transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Font Loading (in layout.tsx or _app.tsx)
```tsx
import { Fraunces, Karla, DM_Mono } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  axes: ['SOFT', 'opsz']
});

const karla = Karla({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700']
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500']
});
```

---

## 🎯 Design Goals Summary

**Warmth**: Cream backgrounds, warm greys, golden accents
**Energy**: Vibrant terra cotta CTAs, confident animations, gradient overlays
**Trust**: Generous spacing, clear typography, professional polish
**Anticipation**: Progress visualization, staggered reveals, celebration moments
**Premium**: Distinctive fonts, attention to detail, sophisticated color palette
**Nordic**: Natural tones, clean composition, quality over quantity

---

## ⚠️ What to AVOID

❌ Pure white backgrounds (use cream/snow-warm)
❌ Pure black text (use charcoal)
❌ Generic grey borders (use stone)
❌ System fonts (use Fraunces, Karla, DM Mono)
❌ Red error states (use terra cotta)
❌ Flat, lifeless cards (add gradients, shadows, hover states)
❌ Instant animations (use stagger delays)
❌ Generic "Add to Cart" copy (use "BESTILL NÅ" or "RESERVER DIN BOKS")

---

## 🚀 Implementation Priority

1. **Global Styles**: CSS variables, font loading, base styles
2. **Component Library**: Buttons, cards, inputs, badges
3. **Homepage Hero**: First impression with warm gradient
4. **Product Cards**: Energized, warm, with hover states
5. **Checkout Flow**: Confident progress stepper
6. **Success States**: Celebration moments
7. **Polish**: Animations, micro-interactions, loading states

---

This design system transforms your premium Mangalitsa pork into an exciting, warm, and memorable experience. The customer should feel the same anticipation ordering this box as they would feel unwrapping it on Christmas Eve. 🎄✨
