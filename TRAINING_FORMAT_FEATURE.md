# Training Format Feature — Implementation Guide

## Overview
Trainers can now select between three training formats (Full / 120-min / 90-min) and customize which slides to include in each format. The system filters slides accordingly and provides timing estimates.

---

## How It Works

### For Trainers (Directors)
1. **See the format selector** at the top of the Studio (blue banner)
2. **Click the dropdown** to choose format: Full (3hr), Kompakt (2hr), or Fokusert (90min)
3. **Toggle slides** in the modal: select which slides to include in that format
4. **See timing estimate** (~120 min, ~90 min, etc. based on selected slides)
5. **Click "Lagre innstillinger"** to save format preferences
6. **Slides auto-filter**: the Studio only shows selected slides for the active format
7. **Navigate normally**: use arrow keys, module rail, etc. to move through selected slides

### For Non-Directors (Viewers)
- Format selector is hidden; they see the director's published version only

### Data Storage
- Format preferences stored per director in `bnimsp_user_notes` (special row: `slide_n=0`)
- Includes: active format + array of selected slide numbers
- Automatically loaded when entering the Studio

---

## Architecture

### New Files
- `lib/bnimsp/format-types.ts` — Type definitions (TrainingFormat, FormatConfig)
- `components/bnimsp/TrainingFormatSelector.tsx` — UI component
- `app/api/bnimsp/format/route.ts` — GET/PUT API for format prefs

### Modified Files
- `components/bnimsp/Studio.tsx` — Integrated format selector, slide filtering

### Database
- Uses existing `bnimsp_user_notes` table
- Special row: `slide_n=0` stores format config as JSON

---

## User Flow

```
[Studio loads]
  ↓
[Load format prefs from /api/bnimsp/format]
  ↓
[Show TrainingFormatSelector at top]
  ↓
[Trainer clicks format or adjusts slides]
  ↓
[Slides filtered: only show selected slides]
  ↓
[Save format prefs to /api/bnimsp/format]
  ↓
[Current slide auto-adjusts if deselected]
```

---

## Features

### Format Selection
- **Full (3 timer)** — Hele programmet med pause – best for full engagement
- **Kompakt (2 timer)** — Kjerne + viktige eksempler – passer til halvdagsworkshop
- **Fokusert (90 min)** — Essensielt innhold – fokus på hovedmeldinger

### Slide Toggle UI
- Grid of slide numbers (1–40)
- Click to select/deselect
- "Select all" button to reset
- Visual feedback: selected slides are blue, unselected are gray
- Count: "5/40 slides selected"

### Timing Estimates
- Auto-calculated based on selected slides
- Formula: (selected / total) × format duration
- e.g., 20/40 slides in 90min format → ~45 min estimated

### Data Validation
- At least one slide must be selected
- Changes only save if valid
- Error messages on validation failure

---

## Future Enhancements (Out of Scope)

1. **Format-specific scripts** — per-trainer, per-slide, per-format script variants
   - Would add `scriptOverrides` storage + UI to edit 90min/120min versions separately
   - Could shorten "Si dette" for condensed formats

2. **Format-specific tasks** — condensed participation tasks for 90min
   - Same pattern as scripts but for `askGroup`
   - e.g., "Full task (5 min)" vs "Quick version (2 min)"

3. **Custom format names** — let trainers create custom durations
   - e.g., "Webinar (60 min)" or "Deep dive (4 hours)"

4. **Format templates** — save/load common format selections
   - e.g., "BNI directors training" = slides 1–25, "Onboarding" = slides 1–15

5. **Presenter mode awareness** — show current format in presenter view
   - Display "90-min version · Slide 5/20" instead of "5/40"

6. **Export format** — save condensed agenda as PDF/outline
   - What slides, what order, timing per slide

---

## Testing Checklist

- [ ] Format selector appears for directors only
- [ ] Can click format dropdown without errors
- [ ] Can toggle individual slide numbers
- [ ] "Select all" button resets to all selected
- [ ] Timing estimate updates as slides are toggled
- [ ] Can save format prefs (no network errors)
- [ ] After save, format selector closes
- [ ] Page reload preserves format + slide selection
- [ ] Unselected slides don't appear in Studio
- [ ] Current slide adjusts if deselected (moves to next available)
- [ ] Switching formats updates the selector state
- [ ] Two directors can have different format selections (isolation test)

---

## Styling Notes

- **Colors**: Blue (primary) for format selector, matching BNI brand
- **Responsive**: Grid collapses on mobile; consider widening on large screens
- **Accessibility**: All buttons labeled, keyboard navigable

---

## API Reference

### GET /api/bnimsp/format
Returns director's saved format preferences.

**Response:**
```json
{
  "activeFormat": "90min",
  "selectedSlides": [1, 2, 3, 5, 7, 10, 15, 20]
}
```

**Defaults:** `activeFormat: "full"`, `selectedSlides: []`

### PUT /api/bnimsp/format
Save director's format preferences.

**Request:**
```json
{
  "activeFormat": "90min",
  "selectedSlides": [1, 2, 3, 5, 7, 10, 15, 20]
}
```

**Validation:**
- `activeFormat` must be one of: "full", "120min", "90min"
- `selectedSlides` must be a non-empty array of integers
- Returns 400 if validation fails

---

## Known Limitations

1. **Scripts not shortened** — currently just hides slides; doesn't shorten the actual "Si dette" for condensed formats
   - Future: add script variants per format
   
2. **No shared formats** — each trainer has their own slide selection
   - Future: could export/import format templates

3. **Timing is estimated** — based on slide count, not actual content length
   - Better approach: let trainers customize per-slide timing override

4. **No visual diff** — can't see which slides are new in a format
   - Could add "new in 90min" or "removed from 90min" badges

---

## Troubleshooting

### Format selector not showing
→ Only visible to directors. Non-directors see the published version only.

### Changes don't persist
→ Check browser console for fetch errors. Ensure `/api/bnimsp/format` is reachable.

### Current slide jumps after save
→ This is expected if the current slide was deselected. The system moves to the nearest available slide.

### Timing estimate seems wrong
→ It's based on (selected / total) × format duration. Customize individual slide timing for accuracy.
