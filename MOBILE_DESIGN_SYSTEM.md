# Mobile Design System - Tinglum Gård

## Overview
This design system defines the mobile-first experience for Tinglum Gård, focusing on clarity, premium feel, and seamless ordering flow.

---

## Design Principles

### 1. **Clarity Over Complexity**
- Remove decorative glassmorphism effects that obscure content
- Use solid, high-contrast backgrounds for critical information
- Ensure text is always readable (WCAG AAA compliant)

### 2. **Premium & Grounded**
- Earthy color palette reflecting local farm heritage
- Natural materials: wood textures, stone, earth tones
- Minimal animations - only when they serve a purpose

### 3. **Thumb-First Navigation**
- All interactive elements 48px minimum tap target
- Critical actions in thumb-reach zone (bottom 60% of screen)
- Sticky navigation/CTAs when needed

---

## Color System

### Primary Palette
```css
--farm-earth: #2D2416;      /* Dark earth brown */
--farm-bark: #4A3F2E;       /* Tree bark */
--farm-moss: #5F7355;       /* Norwegian moss */
--farm-sky: #8B9DC3;        /* Mountain sky */
--farm-snow: #F4F1E8;       /* Winter snow */
```

### Accent Colors
```css
--accent-gold: #C9A962;     /* Premium gold */
--accent-rust: #B85C38;     /* Autumn rust */
--accent-forest: #3D5A3D;   /* Deep forest green */
```

### Status Colors
```css
--status-success: #4A7C3C;  /* Muted green */
--status-error: #A83232;    /* Muted red */
--status-warning: #C49A3A;  /* Amber */
--status-info: #5B7C9E;     /* Muted blue */
```

### Transparency Layers
```css
--overlay-light: rgba(244, 241, 232, 0.95);
--overlay-medium: rgba(45, 36, 22, 0.85);
--overlay-dark: rgba(0, 0, 0, 0.7);
```

---

## Typography

### Font Stack
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-display: 'Playfair Display', Georgia, serif; /* For headings only */
```

### Scale (Mobile-First)
```css
/* Headings */
--text-h1: 2.5rem;     /* 40px - Hero headlines */
--text-h2: 2rem;       /* 32px - Section titles */
--text-h3: 1.5rem;     /* 24px - Card titles */
--text-h4: 1.25rem;    /* 20px - Subsections */

/* Body */
--text-lg: 1.125rem;   /* 18px - Primary body */
--text-base: 1rem;     /* 16px - Secondary body */
--text-sm: 0.875rem;   /* 14px - Labels, captions */
--text-xs: 0.75rem;    /* 12px - Fine print */
```

### Font Weights
```css
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

---

## Spacing System

### Base Unit: 4px
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
```

### Layout Spacing
```css
--container-padding: 1rem;    /* 16px sides */
--section-gap: 3rem;          /* 48px between sections */
--card-padding: 1.5rem;       /* 24px inside cards */
--button-padding: 1rem 1.5rem; /* 16px vertical, 24px horizontal */
```

---

## Components

### Cards
```css
.card-mobile {
  background: var(--farm-snow);
  border-radius: 16px;
  padding: var(--card-padding);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.12);
}

.card-mobile-dark {
  background: var(--farm-earth);
  color: var(--farm-snow);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-mobile-elevated {
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.12),
    0 2px 4px rgba(0, 0, 0, 0.16);
}
```

### Buttons
```css
.btn-primary {
  background: var(--farm-earth);
  color: var(--farm-snow);
  padding: var(--button-padding);
  border-radius: 12px;
  font-weight: var(--weight-semibold);
  font-size: var(--text-lg);
  min-height: 52px;
  transition: all 0.2s ease;
}

.btn-primary:active {
  transform: scale(0.98);
  background: var(--farm-bark);
}

.btn-secondary {
  background: transparent;
  color: var(--farm-earth);
  border: 2px solid var(--farm-earth);
}

.btn-ghost {
  background: transparent;
  color: var(--farm-moss);
  text-decoration: underline;
}
```

### Input Fields
```css
.input-mobile {
  background: white;
  border: 2px solid var(--farm-snow);
  border-radius: 12px;
  padding: 1rem;
  font-size: var(--text-base);
  min-height: 52px;
  transition: border-color 0.2s ease;
}

.input-mobile:focus {
  border-color: var(--farm-moss);
  outline: none;
  box-shadow: 0 0 0 3px rgba(95, 115, 85, 0.1);
}
```

---

## Checkout Flow - Mobile Optimized

### Step 1: Package Selection
**BEFORE (Current Issues):**
- Glassmorphism makes text hard to read
- "kr undefined" shown when loading
- Too much visual noise

**AFTER (New Design):**
```tsx
<div className="space-y-4 px-4 py-8">
  <h2 className="text-2xl font-bold text-farm-earth mb-2">
    Velg kassestørrelse
  </h2>
  <p className="text-base text-farm-bark mb-6">
    Velg den størrelsen som passer for husstanden din
  </p>

  {/* 8kg Card */}
  <button className={`
    w-full card-mobile p-6 text-left transition-all
    ${boxSize === '8' ? 'ring-2 ring-farm-moss' : ''}
  `}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="text-4xl font-bold text-farm-earth mb-1">
          8 <span className="text-xl text-farm-bark">kg</span>
        </div>
        <div className="text-sm text-farm-bark">2-3 personer</div>
      </div>
      {pricing ? (
        <div className="text-right">
          <div className="text-2xl font-bold text-farm-earth">
            {pricing.box_8kg_price.toLocaleString('nb-NO')} kr
          </div>
          <div className="text-xs text-farm-bark mt-1">
            Forskudd: {(pricing.box_8kg_price * 0.5).toLocaleString('nb-NO')} kr
          </div>
        </div>
      ) : (
        <div className="text-right">
          <div className="text-lg text-farm-bark animate-pulse">
            Laster...
          </div>
        </div>
      )}
    </div>

    {/* Contents Preview - Only when selected */}
    {boxSize === '8' && (
      <div className="pt-4 border-t border-farm-snow">
        <div className="text-xs font-semibold text-farm-bark uppercase tracking-wide mb-2">
          I kassen:
        </div>
        <div className="space-y-1.5">
          {contents.map(item => (
            <div className="flex items-start gap-2 text-sm text-farm-bark">
              <Check className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </button>

  {/* 12kg Card - Same pattern */}
</div>
```

### Step 2: Ribbe Selection
```tsx
<div className="space-y-4 px-4 py-8">
  <div className="flex items-center gap-3 mb-6">
    <div className="w-8 h-8 rounded-full bg-farm-moss text-farm-snow flex items-center justify-center font-semibold">
      ✓
    </div>
    <div className="flex-1">
      <div className="text-sm text-farm-bark">8kg kasse valgt</div>
    </div>
    <button className="text-sm text-farm-moss font-medium">Endre</button>
  </div>

  <h2 className="text-2xl font-bold text-farm-earth mb-2">
    Velg ribbetype
  </h2>
  <p className="text-base text-farm-bark mb-6">
    Vi anbefaler slakterens valg for beste kvalitet
  </p>

  {/* Radio cards */}
  <div className="space-y-3">
    {ribbeOptions.map(option => (
      <label className={`
        block card-mobile p-5 cursor-pointer transition-all
        ${ribbeChoice === option.id ? 'ring-2 ring-farm-moss bg-farm-snow' : ''}
      `}>
        <div className="flex items-start gap-4">
          <input 
            type="radio" 
            className="mt-1 w-5 h-5 text-farm-moss"
            checked={ribbeChoice === option.id}
          />
          <div className="flex-1">
            <div className="font-semibold text-farm-earth mb-1">
              {option.name}
              {option.recommended && (
                <span className="ml-2 text-xs bg-accent-gold text-white px-2 py-0.5 rounded">
                  Anbefalt
                </span>
              )}
            </div>
            <div className="text-sm text-farm-bark">
              {option.description}
            </div>
          </div>
        </div>
      </label>
    ))}
  </div>
</div>
```

### Step 3: Extras & Delivery
```tsx
<div className="space-y-6 px-4 py-8">
  {/* Progress breadcrumbs */}
  <div className="flex items-center gap-2 text-sm mb-6">
    <span className="text-status-success">✓ Kasse</span>
    <span className="text-farm-bark">•</span>
    <span className="text-status-success">✓ Ribbe</span>
    <span className="text-farm-bark">•</span>
    <span className="text-farm-earth font-semibold">Levering</span>
  </div>

  {/* Delivery Type */}
  <div>
    <h3 className="text-xl font-bold text-farm-earth mb-3">
      Leveringsmåte
    </h3>
    <div className="space-y-2">
      {deliveryOptions.map(option => (
        <button className={`
          w-full card-mobile p-4 text-left flex justify-between items-center
          ${deliveryType === option.id ? 'ring-2 ring-farm-moss' : ''}
        `}>
          <div>
            <div className="font-semibold text-farm-earth">{option.name}</div>
            <div className="text-sm text-farm-bark">{option.description}</div>
          </div>
          <div className="text-lg font-bold text-farm-earth">
            {option.price > 0 ? `${option.price} kr` : 'Gratis'}
          </div>
        </button>
      ))}
    </div>
  </div>

  {/* Optional extras */}
  <div>
    <h3 className="text-xl font-bold text-farm-earth mb-3">
      Ekstra produkter <span className="text-base font-normal text-farm-bark">(valgfritt)</span>
    </h3>
    <div className="space-y-3">
      {availableExtras.map(extra => (
        <div className="card-mobile p-4">
          <label className="flex gap-4 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-5 h-5 mt-1 text-farm-moss rounded"
            />
            <div className="flex-1">
              <div className="font-semibold text-farm-earth">{extra.name}</div>
              <div className="text-sm text-farm-bark mb-2">{extra.description}</div>
              <div className="text-lg font-bold text-farm-earth">
                {extra.price} kr
              </div>
            </div>
          </label>
        </div>
      ))}
    </div>
  </div>
</div>
```

### Step 4: Summary & Checkout
```tsx
<div className="space-y-6 px-4 py-8 pb-32">
  <h2 className="text-2xl font-bold text-farm-earth mb-2">
    Oppsummering
  </h2>

  {/* Order summary card */}
  <div className="card-mobile-dark p-6 space-y-4">
    <div className="flex justify-between">
      <span className="text-farm-snow">8kg kasse</span>
      <span className="font-semibold text-farm-snow">3 500 kr</span>
    </div>
    <div className="flex justify-between">
      <span className="text-farm-snow/70">Tynnribbe</span>
      <span className="text-farm-snow/70">Inkludert</span>
    </div>
    {deliveryFee > 0 && (
      <div className="flex justify-between">
        <span className="text-farm-snow/70">Levering (Trondheim)</span>
        <span className="text-farm-snow/70">{deliveryFee} kr</span>
      </div>
    )}
    
    {/* Divider */}
    <div className="border-t border-white/20 pt-4">
      <div className="flex justify-between text-lg">
        <span className="font-semibold text-farm-snow">Totalpris</span>
        <span className="font-bold text-accent-gold">{totalPrice.toLocaleString('nb-NO')} kr</span>
      </div>
      <div className="flex justify-between text-sm mt-2">
        <span className="text-farm-snow/70">Forskudd (50%)</span>
        <span className="text-farm-snow">{depositAmount.toLocaleString('nb-NO')} kr</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-farm-snow/70">Rest ved levering</span>
        <span className="text-farm-snow">{remainderAmount.toLocaleString('nb-NO')} kr</span>
      </div>
    </div>
  </div>

  {/* Terms checkboxes */}
  <div className="space-y-3">
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" className="w-5 h-5 mt-1 text-farm-moss rounded" />
      <span className="text-sm text-farm-bark">
        Jeg har lest og godtar <a href="/vilkar" className="text-farm-moss underline">vilkårene</a>
      </span>
    </label>
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" className="w-5 h-5 mt-1 text-farm-moss rounded" />
      <span className="text-sm text-farm-bark">
        Jeg forstår at forskuddet ikke refunderes
      </span>
    </label>
  </div>
</div>

{/* Sticky footer with CTA */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-farm-snow p-4 safe-area-bottom">
  <button 
    disabled={!canCheckout}
    className="btn-primary w-full"
  >
    {isProcessing ? 'Behandler...' : `Betal forskudd ${depositAmount.toLocaleString('nb-NO')} kr`}
  </button>
  <div className="text-xs text-center text-farm-bark mt-2">
    Sikker betaling med Vipps
  </div>
</div>
```

---

## Animation Guidelines

### Principle: Purposeful Motion Only
- **Entry animations**: Fade + slight vertical movement (20px max)
- **State changes**: 200ms ease transitions
- **Loading states**: Subtle pulse or spinner only
- **Success states**: Single checkmark animation

### Remove These:
- ❌ Prismatic gradient animations
- ❌ Parallax scrolling effects
- ❌ Glassmorphism blur effects
- ❌ Continuous glow animations

### Keep These:
- ✅ Button press feedback (scale 0.98)
- ✅ Card selection state transitions
- ✅ Loading spinners
- ✅ Success checkmarks

---

## Performance Targets

### Mobile Performance
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

### Optimization Strategies
1. Remove heavy glassmorphism backdrop-filter effects
2. Lazy load images below fold
3. Minimize animation-heavy components
4. Use `will-change` sparingly
5. Optimize custom fonts (preload, font-display: swap)

---

## Accessibility

### Touch Targets
- Minimum size: 48x48px (Apple/Google guidelines)
- Spacing between targets: 8px minimum
- Thumb-reach optimization: bottom 60% of screen

### Color Contrast
- All text: WCAG AAA (7:1 minimum)
- Interactive elements: 4.5:1 minimum
- Focus indicators: 3:1 against background

### Focus States
```css
.focusable:focus-visible {
  outline: 3px solid var(--farm-moss);
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## Implementation Priority

### Phase 1: Critical Path (Week 1)
1. ✅ Remove glassmorphism from checkout flow
2. ✅ Implement new card design system
3. ✅ Fix price loading states
4. ✅ Redesign sticky checkout footer

### Phase 2: Polish (Week 2)
1. Update MobileHero with new palette
2. Redesign MobileProductTiles
3. Improve form inputs and validation
4. Add better error states

### Phase 3: Enhancement (Week 3)
1. Add micro-interactions
2. Optimize images and assets
3. Implement skeleton loaders
4. Final performance audit

---

## Testing Checklist

### Devices to Test
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch/dynamic island)
- [ ] Samsung Galaxy S22 (Android)
- [ ] iPad Mini (tablet)

### Scenarios
- [ ] Complete order flow start to finish
- [ ] Slow 3G connection simulation
- [ ] Dark mode (if applicable)
- [ ] Landscape orientation
- [ ] With discount codes applied
- [ ] Error states (payment failure, network error)

---

## Code Examples

### Example: New Price Card Component
```tsx
interface PriceCardProps {
  size: 8 | 12;
  price: number | null;
  isSelected: boolean;
  onSelect: () => void;
  contents: string[];
}

export function PriceCard({ size, price, isSelected, onSelect, contents }: PriceCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-6 rounded-2xl transition-all duration-200",
        "bg-farm-snow border-2",
        isSelected 
          ? "border-farm-moss shadow-lg" 
          : "border-transparent hover:border-farm-snow"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-4xl font-bold text-farm-earth">
            {size} <span className="text-xl text-farm-bark">kg</span>
          </div>
          <div className="text-sm text-farm-bark mt-1">
            {size === 8 ? '2-3 personer' : '4-6 personer'}
          </div>
        </div>
        
        {price !== null ? (
          <div className="text-right">
            <div className="text-2xl font-bold text-farm-earth">
              {price.toLocaleString('nb-NO')} kr
            </div>
            <div className="text-xs text-farm-bark mt-1">
              Forskudd: {(price * 0.5).toLocaleString('nb-NO')} kr
            </div>
          </div>
        ) : (
          <div className="text-lg text-farm-bark animate-pulse">
            Laster...
          </div>
        )}
      </div>

      {isSelected && (
        <div className="pt-4 border-t border-farm-bark/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="text-xs font-semibold text-farm-bark uppercase tracking-wide mb-3">
            I kassen:
          </div>
          <div className="space-y-2">
            {contents.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-farm-bark">
                <Check className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
```

---

## Questions & Decisions

### Open Questions
1. Should we use sticky progress indicators at the top?
2. Do we need a "Save for later" feature?
3. Should discount codes be more prominent?

### Decisions Made
- ✅ Remove all glassmorphism effects
- ✅ Use earthy color palette instead of prismatic
- ✅ Sticky checkout button at bottom
- ✅ Show prices only when loaded (no fallbacks)
- ✅ Single-column layout for all steps

---

## Resources

### Design Files
- Figma: [Add link when created]
- Color palette exports: `/design/colors.json`
- Icon set: Lucide React (already in use)

### Dependencies
- Tailwind CSS (configured)
- Framer Motion (for purposeful animations only)
- Radix UI primitives (for accessibility)

### References
- [Apple Human Interface Guidelines - Mobile](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

*Last updated: February 2, 2026*
*Owner: Kenneth Opdahl Tinglum*
