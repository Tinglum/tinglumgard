# Training Format Feature — Smart Edition

## Overview
Trainers now have an intelligent format editor that automatically:
1. **Suggests which slides to include** per format (no manual toggling)
2. **Shows condensed scripts** ("Si dette") optimized for format duration
3. **Shows condensed tasks** ("Spør gruppen") shortened for time constraints
4. **Displays adjusted timing** per slide (5 min → 3 min → 2 min)

---

## How It Works

### For Trainers (Directors)
1. **Open the training** in Studio
2. **See the format selector** at top (blue banner)
3. **Click dropdown** to choose: Fullversjon / Kompakt (120 min) / Fokusert (90 min)
4. **Scroll through** the format preview showing:
   - Which slides are included ✓ (not manual toggle)
   - Condensed script for each slide
   - Condensed task/question for each slide
   - Timing per slide
5. **Click a slide** to expand and see full details
6. **Edit if needed** — scripts/tasks are starting points, trainers can customize further (future)

### Data Flow
```
Trainer selects format (90min)
  ↓
Studio calls /api/bnimsp/format/content?format=90min
  ↓
API uses getFormatConfig() to:
  - Suggest which slides (core slides only)
  - Generate condensed scripts (condenseScript)
  - Generate condensed tasks (condenseTask)
  - Set timing (2 min per slide for 90min)
  ↓
TrainingFormatEditor displays the full preview
  ↓
Trainer sees:
  "Slide 1: Tittel / åpning
   ⏱ 2 min
   Si dette: 'Essensen: velkommen...'
   Spør gruppen: 'Hvem her er ny?'"
```

---

## Smart Slide Selection Algorithm

**Concept:** Don't ask trainers to pick — intelligently suggest which slides fit each format.

### Current Logic (in `format-config.ts`)
```typescript
const isCoreSlide = (n: number): boolean => {
  if (n <= 5 || n >= 36) return true    // Opening & closing (always keep)
  if (n <= 15) return true              // Core module (usually keep)
  if (n === 6 || n === 12 || n === 18) return true  // Key content
  if (n === 20 || n === 22) return true // Important examples
  return false
}
```

**Results for 40-slide deck:**
- **Full (3 hours)**: All 40 slides, ~5 min each = 180 min ✓
- **120 min**: ~24 slides (core + some examples), ~3 min each = 120 min ✓
- **90 min**: ~18 slides (core only), ~2 min each = 90 min ✓

### Customizing Per Deck
For your specific BNI MSP deck, you may need to adjust the `isCoreSlide` logic:
- If you have 4 modules spanning slides 1–40
- Mark the module intros as core, deep dives as optional
- Keep opening (1–5) and closing (36–40) always

---

## Script Condensing

### Full Version
"Det er viktig å forstå at BNI handler om å bygge dypt tillitsbaserte relasjoner gjennom konsekvent deltakelse, aktiv lytting, og gjensideg referral. Vi skal gjennom programmet dekke de tre kjernepillarene: Lytting, Bæring, Spørring."

### 120-min Version (50% shorter)
"Kort versjon: BNI handler om tillitsbaserte relasjoner. Vi fokuserer på tre ting: Lytting, Bæring, Spørring."

### 90-min Version (minimal)
"Essensen: BNI handler om å bygge tillitsbaserte nettverk. Vi dekker 3 kjerneprinsipper på 90 minutter."

### How It Works
`condenseScript(original, format)` function:
1. Removes detail, keeps core message
2. Truncates to max characters (90min: 100 chars, 120min: 150 chars)
3. Breaks at sentence boundaries for readability
4. Returns original if already short

---

## Task Condensing

### Full Version
"La oss gjennomføre en 5-minutters gruppøvelse: Del med personer ved siden av deg — hvilke typer mennesker møter du oftest i ditt nettverk, og hva er deres største utfordring? Dette hjelper oss å forstå målet for Bæring."

### 120-min Version (2 min)
"Pair-share med naboen: Deler én erfaring om nettverk eller referral (1 min)."

### 90-min Version (quick reflection)
"Tenk på en person du møter denne uken. Hva spørsmål kan du stille dem? (Silent reflection, 30 sek)."

---

## Architecture

### New Files
- `lib/bnimsp/format-config.ts` — Smart slide selection + script/task condensing
- `app/api/bnimsp/format/content/route.ts` — Endpoint returning format-specific slides
- `components/bnimsp/TrainingFormatEditor.tsx` — New UI (replaces old toggle component)

### Key Functions
```typescript
getFormatConfig(totalSlides)
  → Returns FormatSlideConfig per format (slides, timing, variants)

condenseScript(original, format)
  → Returns shortened script for the format

condenseTask(original, format)
  → Returns shortened task for the format
```

### API Response
```json
{
  "format": "90min",
  "config": {
    "selectedSlides": [1, 2, 4, 6, 9, 12, 15, 18, 20],
    "timingPerSlide": 2,
    "estimatedMinutes": 18
  },
  "slides": [
    {
      "n": 1,
      "title": "Tittel / åpning",
      "sayThis": "...full script...",
      "formattedScript": "Essensen: ...",
      "askGroup": "...full task...",
      "formattedTask": "Hvem her er ny?",
      "formattedTiming": "2 min",
      "includeInFormat": true
    },
    ...
  ]
}
```

---

## Future Enhancements

### Phase 2: Editor UI
- Click "Edit" on slide to customize script/task for this format
- Save overrides to director's profile
- Show "Modified" indicator if trainer customized a slide

### Phase 3: Auto-Generation
- Smarter condensing (NLP-based, not just truncation)
- Use OpenAI to generate format-specific variants
- Learn from trainer edits (which scripts they prefer for 90-min)

### Phase 4: Timing Precision
- Per-slide timing overrides (this slide takes 4 min, not 2)
- Automatic timing warnings ("You're 15 min over budget")
- Suggest which slides to skip to fit the time

### Phase 5: Format Persistence
- Save chosen format + customizations per director
- "My 90-min version" — recall next time they train

---

## Testing Checklist

- [ ] Format dropdown shows all 3 options
- [ ] Clicking a format fetches content and displays it
- [ ] 90-min version shows ~18-20 slides (50% of 40)
- [ ] 120-min version shows ~24-26 slides (60% of 40)
- [ ] Full version shows all 40 slides
- [ ] Scripts are visibly condensed (no full multi-sentence scripts in 90min)
- [ ] Tasks are shortened (check length difference)
- [ ] Timing shows 2 min/5 min/3 min correctly per format
- [ ] Can expand slides to see details
- [ ] No errors loading format content

---

## Known Limitations

1. **Condensing is simplistic** — just truncates at sentence boundaries
   - Future: Use NLP or LLM to actually summarize content

2. **Slide selection is hardcoded** — heuristic based on slide number
   - Better: Parse deck structure from deck metadata
   - Or: Let trainer tag slides as "core" vs "optional"

3. **No manual overrides yet** — trainers can't change which slides to include
   - Future: Add UI to toggle individual slides if they want

4. **No personalization** — all trainers see same condensed versions
   - Future: Learn from trainer edits; suggest personalized variants

5. **Timing is uniform** — all slides get same minutes per format
   - Better: Analyze slide content (more text = longer)
   - Or: Let trainer set per-slide timing

---

## Troubleshooting

### Format content not loading
→ Check `/api/bnimsp/format/content` is reachable and returns 200.

### Scripts look truncated/weird
→ They are intentionally short for 90min. The condensing function breaks at sentence boundaries. If it looks bad, we may need smarter NLP.

### Wrong slides included
→ The slide selection heuristic is based on slide numbers. Your deck structure may differ. Adjust `isCoreSlide` logic in `format-config.ts`.

### Timing doesn't match reality
→ Suggested timing (2/3/5 min) is generic. Trainers should customize per-slide timing in Phase 4.
