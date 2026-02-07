# STEP 3: VISUAL SYSTEM (NORDIC MINIMAL)

**Core Aesthetic:** Scandinavian Clarity
- Ultra-refined minimalism with intelligent depth
- Authentic glassmorphism (not flat cards)
- Atmospheric gradient backgrounds
- Breed-specific color halos (subtle accent integration)
- Sharp typography with generous breathing room
- Staggered reveal animations on scroll
- Calendar-first interaction model

**Critical constraint:** NO rustic, NO vintage, NO "granny" aesthetic

---

## 1. COLOR SYSTEM

### 1.1 Neutral Palette (Cool-toned)

**Base grays:**
```
neutral-50:  #fafafa  (backgrounds, lightest surfaces)
neutral-100: #f5f5f5  (subtle elevation)
neutral-200: #e5e5e5  (borders, dividers)
neutral-300: #d4d4d4  (disabled text)
neutral-400: #a3a3a3  (placeholder text)
neutral-500: #737373  (secondary text)
neutral-600: #525252  (body text)
neutral-700: #404040  (emphasized text)
neutral-800: #262626  (headings)
neutral-900: #171717  (hero text, strongest contrast)
```

**Why cool-toned:**
- Feels cleaner, more Nordic
- Better contrast with warm breed accents
- Reduces visual noise

### 1.2 Breed Accent Colors (ONLY for halos, not decoration)

```
Ayam Cemani:    #1A1A1A  (Monochrome black)
Jersey Giant:   #475569  (Cool blue-gray)
Silverudd's Blå: #8B7355  (Warm taupe)
Cream Legbar:   #D4A574  (Soft cream)
```

**Usage rules:**
1. ✅ **Allowed:**
   - Breed avatar circle background
   - Subtle left border on cards (2px)
   - Hover state halos (low opacity, blur)
   - Active week selection indicator

2. ❌ **Forbidden:**
   - Large colored sections
   - Button backgrounds (use neutral-900)
   - Decorative shapes
   - Full card backgrounds

**Why:** Accents guide focus, not dominate.

### 1.3 Semantic Colors

**Status indicators:**
```
success-50:  #f0fdf4  (background)
success-700: #15803d  (text/icons)

warning-50:  #fffbeb  (background)
warning-700: #b45309  (text/icons)

error-50:    #fef2f2  (background)
error-700:   #b91c1c  (text/icons)

info-50:     #eff6ff  (background)
info-700:    #1d4ed8  (text/icons)
```

**Usage:**
- Badge backgrounds (50 shade)
- Badge text/icons (700 shade)
- Never for large surfaces

### 1.4 Gradients (Atmospheric only)

**Background gradient:**
```css
background: linear-gradient(
  135deg,
  neutral-50 0%,
  neutral-100 50%,
  neutral-200 100%
);
```

**Subtle noise overlay:**
```css
opacity: 0.015;
background-image: url('data:image/svg+xml,...fractal-noise');
```

**Why:** Creates depth without color.

---

## 2. TYPOGRAPHY

### 2.1 Font Families

**Display (headings, emphasis):**
```
font-family: 'Space Grotesk', system-ui, sans-serif;
font-weight: 500 (medium), 600 (semibold), 700 (bold);
```

**Body (paragraphs, UI text):**
```
font-family: 'Inter', system-ui, sans-serif;
font-weight: 400 (regular), 500 (medium), 600 (semibold);
```

**Why Space Grotesk:**
- Distinctive but not quirky
- Excellent legibility at large sizes
- Works with glassmorphism (clear letterforms)

**Why Inter:**
- Industry-standard for UI
- Perfect hinting on all platforms
- Neutral, doesn't compete with Space Grotesk

### 2.2 Type Scale (Major Third - 1.25 ratio)

```
text-xs:     0.75rem   (12px)  - Captions, microcopy
text-sm:     0.875rem  (14px)  - Secondary text, badges
text-base:   1rem      (16px)  - Body text (default)
text-lg:     1.125rem  (18px)  - Emphasized body
text-xl:     1.25rem   (20px)  - Small headings
text-2xl:    1.563rem  (25px)  - Card titles
text-3xl:    1.953rem  (31px)  - Section headings
text-4xl:    2.441rem  (39px)  - Page headings
text-5xl:    3.052rem  (49px)  - Hero headings
text-6xl:    3.815rem  (61px)  - Landing hero
```

### 2.3 Line Heights

```
leading-none:    1.0   (Display only, never body)
leading-tight:   1.25  (Large headings)
leading-snug:    1.375 (Subheadings)
leading-normal:  1.5   (Body text - always)
leading-relaxed: 1.625 (Long-form content)
```

**Rules:**
- Body text always 1.5 minimum
- Headings 1.25-1.375
- Never tighter than 1.0

### 2.4 Line Length Constraints

**Desktop:**
- Max width for body text: `65ch` (characters)
- Max width for headings: `45ch`

**Mobile:**
- Max width: `100%` (full width OK on small screens)

**Why:** Readability science - 50-75 characters per line is optimal.

### 2.5 Letter Spacing

```
tracking-tighter:  -0.05em  (Large display only)
tracking-tight:    -0.025em (Headings)
tracking-normal:   0em      (Body - default)
tracking-wide:     0.025em  (Uppercase labels)
tracking-wider:    0.05em   (Uppercase headings)
tracking-widest:   0.1em    (Uppercase microcopy)
```

**Rules:**
- Body text always tracking-normal
- UPPERCASE always gets positive tracking
- Large headings (4xl+) can use negative tracking

---

## 3. GLASSMORPHISM SYSTEM

### 3.1 Glass Variants

**Light (default cards):**
```css
background: rgba(255, 255, 255, 0.70);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.20);
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
            0 1px 3px rgba(0, 0, 0, 0.08);
```

**Strong (emphasis, modals):**
```css
background: rgba(255, 255, 255, 0.90);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.30);
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.08),
            0 4px 6px rgba(0, 0, 0, 0.05);
```

**Dark (header, subtle inset):**
```css
background: rgba(0, 0, 0, 0.05);
backdrop-filter: blur(12px);
border: 1px solid rgba(0, 0, 0, 0.08);
```

### 3.2 Where to Use Glass

✅ **Allowed:**
- Cards (breed cards, week cards, order cards)
- Modals (quantity selector, confirmation dialogs)
- Header (sticky top nav)
- Info boxes (disclaimers, policies)
- Input containers (forms, search)

❌ **Forbidden:**
- Page background (use gradient instead)
- Buttons (use solid)
- Badges (use semantic colors)
- Text containers without purpose

**Why:** Glass creates depth hierarchy, not decoration.

### 3.3 Layering Rules

```
z-index scale:
0:  Base content
10: Cards, elevated surfaces
20: Sticky header
30: Dropdowns, tooltips
40: Modals, overlays
50: Toasts, alerts
```

**Blur accumulation:**
- Never stack glass on glass (blur multiplies, becomes unreadable)
- Modal overlay: solid rgba(0,0,0,0.40), NO blur

---

## 4. SPACING SYSTEM (8px Base Grid)

### 4.1 Spacing Scale

```
0:    0px
0.5:  2px   (hairline gaps)
1:    4px   (tight inline)
1.5:  6px
2:    8px   (base unit)
3:    12px  (compact padding)
4:    16px  (default padding)
5:    20px
6:    24px  (card padding)
7:    28px
8:    32px  (section spacing)
10:   40px
12:   48px  (large section spacing)
16:   64px  (hero spacing)
20:   80px
24:   96px  (mega spacing)
```

**Rules:**
- Always use multiples of 4px
- Default card padding: 24px (desktop), 16px (mobile)
- Section spacing: 48-64px (desktop), 32-48px (mobile)

### 4.2 Container Widths

```
container-sm:  640px   (forms, narrow content)
container-md:  768px   (standard pages)
container-lg:  1024px  (breeds grid, admin)
container-xl:  1280px  (landing hero)
```

**Responsive breakpoints:**
```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

---

## 5. BORDER RADIUS SYSTEM

```
rounded-none: 0px      (strict edges - rare)
rounded-sm:   4px      (inputs, badges)
rounded:      8px      (cards, buttons - default)
rounded-md:   12px     (large cards)
rounded-lg:   16px     (modals)
rounded-xl:   24px     (hero sections)
rounded-full: 9999px   (avatars, pills)
```

**Rules:**
- Standard cards: 8px
- Buttons: 8px
- Avatars: always rounded-full
- Modals: 16px

---

## 6. SHADOWS & ELEVATION

### 6.1 Shadow Scale

```
shadow-sm:
  0 1px 2px rgba(0, 0, 0, 0.05)

shadow (default):
  0 4px 6px rgba(0, 0, 0, 0.05),
  0 1px 3px rgba(0, 0, 0, 0.08)

shadow-md:
  0 6px 12px rgba(0, 0, 0, 0.08),
  0 2px 4px rgba(0, 0, 0, 0.06)

shadow-lg:
  0 10px 15px rgba(0, 0, 0, 0.08),
  0 4px 6px rgba(0, 0, 0, 0.05)

shadow-xl:
  0 20px 25px rgba(0, 0, 0, 0.1),
  0 10px 10px rgba(0, 0, 0, 0.04)
```

**Usage:**
- Cards at rest: shadow (default)
- Cards on hover: shadow-md
- Modals: shadow-xl
- Buttons: NO shadow (flat design preferred)

### 6.2 Elevation Hierarchy

```
Level 0: Page background (no shadow)
Level 1: Cards, inputs (shadow)
Level 2: Hover states, dropdowns (shadow-md)
Level 3: Modals, toasts (shadow-lg / shadow-xl)
```

---

## 7. MOTION & ANIMATION

### 7.1 Duration Scale

```
duration-100: 100ms   (instant - micro-interactions)
duration-200: 200ms   (fast - hover, focus)
duration-300: 300ms   (default - page transitions)
duration-500: 500ms   (medium - modals)
duration-700: 700ms   (slow - staggered reveals)
```

**Rules:**
- Hover effects: 200ms
- Page transitions: 300ms
- Modals: 500ms
- Never exceed 700ms (feels sluggish)

### 7.2 Easing Functions

```
ease-linear:      linear
ease-in:          cubic-bezier(0.4, 0.0, 1, 1)
ease-out:         cubic-bezier(0.0, 0.0, 0.2, 1)
ease-in-out:      cubic-bezier(0.4, 0.0, 0.2, 1)  (default)
```

**Default:** ease-in-out (feels most natural)

### 7.3 What Should Animate

✅ **Animate:**
- Hover state (scale, shadow, color)
- Focus rings (appearance)
- Modal entry/exit (fade + slide)
- Page transitions (fade + slide up)
- Loading states (spinner, skeleton)
- Status changes (badge color)

❌ **Never Animate:**
- Body text appearance (jarring)
- Layout shifts (causes reflow)
- Scroll position (user controls this)
- Background gradients (performance)

### 7.4 Staggered Reveals

**Pattern:**
```js
// First item: 0ms delay
// Second item: 100ms delay
// Third item: 200ms delay
// Max delay: 500ms (after 5 items, no more stagger)
```

**Usage:**
- Breed cards on landing
- Week cards on breed detail
- Order cards on account page

**Why:** Feels organic, guides eye down page.

### 7.5 Reduced Motion Support

**Always respect:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. COMPONENT-SPECIFIC RULES

### 8.1 Buttons

**Primary (CTA):**
```css
background: neutral-900;
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
letter-spacing: 0.025em;
transition: all 200ms ease-in-out;

hover:
  background: neutral-800;
  transform: translateY(-1px);
```

**Secondary (Ghost):**
```css
background: transparent;
color: neutral-700;
border: 1px solid neutral-300;
padding: 12px 24px;
border-radius: 8px;

hover:
  border-color: neutral-400;
  background: neutral-50;
```

**Rules:**
- No shadows on buttons
- Always medium/semibold weight
- Icon + text: icon 20px, gap 8px

### 8.2 Inputs

```css
background: white;
border: 1px solid neutral-200;
border-radius: 8px;
padding: 12px 16px;
font-size: 16px; /* Prevents iOS zoom */

focus:
  border-color: neutral-400;
  ring: 0 0 0 3px rgba(0,0,0,0.05);
```

**Rules:**
- Always 16px font size minimum (prevents mobile zoom)
- Focus ring, not outline
- Error state: border-color error-700

### 8.3 Badges

```css
display: inline-flex;
align-items: center;
gap: 4px;
padding: 4px 12px;
border-radius: 4px; /* Tighter radius */
font-size: 12px;
font-weight: 600;
letter-spacing: 0.05em;
text-transform: uppercase;
```

**Color usage:**
- Available: success-50 bg, success-700 text
- Low Stock: warning-50 bg, warning-700 text
- Sold Out: neutral-100 bg, neutral-600 text

### 8.4 Avatars (Breed circles)

```css
width: 64px;  /* Default size */
height: 64px;
border-radius: 9999px;
display: flex;
align-items: center;
justify-content: center;
font-size: 28px;
font-family: 'Space Grotesk';
font-weight: 700;
color: white;
background: [breed-accent-color];
```

**Sizes:**
- Small: 40px (list items)
- Medium: 64px (cards)
- Large: 80px (detail page)

---

## 9. MOBILE-SPECIFIC RULES

### 9.1 Touch Targets

**Minimum:**
- All interactive elements: 44×44px (Apple HIG)
- Buttons: 48px height minimum
- Cards: Full width minus 16px margins

### 9.2 Bottom Sheets (Mobile Modals)

**Pattern:**
```css
position: fixed;
bottom: 0;
left: 0;
right: 0;
border-radius: 24px 24px 0 0; /* Top corners only */
padding: 24px 16px;
max-height: 90vh;
overflow-y: auto;
```

**Desktop equivalent:**
- Centered modal
- Max width 480px
- Border radius all corners

### 9.3 Sticky Elements

**Header:**
- Always sticky on mobile
- Collapses on scroll down (optional enhancement)

**CTA buttons:**
- Fixed to bottom on mobile (40px from bottom)
- Inline on desktop

---

## 10. ACCESSIBILITY STANDARDS

### 10.1 Contrast Ratios (WCAG AA)

**Minimum ratios:**
- Body text (16px): 4.5:1
- Large text (24px+): 3:1
- UI elements: 3:1

**Test all combinations:**
- neutral-600 on white ✓
- neutral-700 on neutral-50 ✓
- Brand accents on white (test each)

### 10.2 Focus States

**Always visible:**
```css
focus-visible:
  outline: none;
  ring: 0 0 0 3px rgba(0,0,0,0.15);
  ring-offset: 2px;
```

**Never:**
```css
/* FORBIDDEN */
*:focus {
  outline: none; /* Without replacement */
}
```

### 10.3 Screen Reader Text

**Pattern:**
```html
<span class="sr-only">
  Breed: Ayam Cemani. Week 13. 18 eggs available.
</span>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 11. LOADING & EMPTY STATES

### 11.1 Skeleton Loaders

**Pattern:**
```css
background: linear-gradient(
  90deg,
  neutral-200 0%,
  neutral-100 50%,
  neutral-200 100%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
border-radius: 8px;

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Usage:**
- Card placeholders while loading breeds
- Week cards while loading inventory
- Never for text (jarring)

### 11.2 Empty States

**Pattern:**
```
┌─────────────────────────────────────────┐
│         [Icon - 64px, neutral-300]      │
│                                         │
│  No orders yet                          │
│  Start your first order today           │
│                                         │
│  [ View Breeds ]                        │
└─────────────────────────────────────────┘
```

**Rules:**
- Always provide CTA to fix empty state
- Icon large, low contrast (doesn't dominate)
- Friendly, helpful copy (not technical)

---

## 12. PRINT STYLES (Order Confirmations)

```css
@media print {
  /* Hide navigation */
  header, nav, footer { display: none; }

  /* Remove shadows */
  * { box-shadow: none !important; }

  /* Use black text */
  * { color: black !important; }

  /* Remove backgrounds */
  body { background: white !important; }

  /* Page breaks */
  .order-card { page-break-inside: avoid; }
}
```

---

## SUMMARY: VISUAL SYSTEM COMPLETE

### Core Principles Established:

1. **Color:** Cool neutrals + subtle breed accents
2. **Typography:** Space Grotesk + Inter, clear hierarchy
3. **Glass:** 3 variants (light/strong/dark), strict usage rules
4. **Spacing:** 8px base grid, consistent padding
5. **Motion:** Fast (200ms), respects reduced motion
6. **Components:** Buttons, inputs, badges, avatars defined
7. **Mobile:** Touch targets, bottom sheets, sticky CTAs
8. **Accessibility:** WCAG AA contrast, visible focus, SR text

### No Code Yet - Only Constraints

These are **design rules**, not implementation.
Step 4 will translate these into:
- TailwindCSS config
- CSS variables
- React components

---

## NEXT: STEP 4 - IMPLEMENTATION

Once you confirm this visual system is correct, I will:

1. Create TailwindCSS config with all tokens
2. Set up custom CSS with glass utilities
3. Build component library (Button, Card, Badge, etc.)
4. Implement all pages from Step 2 UX flows
5. Use frontend-design skill for production-grade code

**Please confirm:** Is this visual system correct and complete?
