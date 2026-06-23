# Training Formats (Full / 120 min / 90 min)

The full 3-hour program is the **master content**. The 120- and 90-minute
versions are **authored deltas on top of it** — not auto-generated. A trainer
builds a shorter version by curating slides and trimming the script/task/pacing,
guided by a live time budget.

## What a trainer does
1. Pick a format in the bar at the top: **Fullversjon / Kompakt / Fokusert**.
2. The studio reshapes to that format: only the included slides show, and each
   slide's "Si dette" / "Spør gruppen" / timing switch to the version authored
   for that format (falling back to the full text until trimmed).
3. The bar shows a live budget: `included slides · X / target min`, turning red
   when over budget. The trainer trims until it fits.
4. Per slide (under the slide image), in a short format:
   - **Utelat / Ta med** — exclude or include this slide in the format.
   - **Timing** — set format-specific pacing (e.g. `ca. 2 min`).
   - Editing "Si dette" / "Spør gruppen" below saves **only** to the active
     format. An empty field inherits the full version, so you start from the
     real script and cut it down.
   - Tags show whether each field is `tilpasset` (trimmed for this format) or
     `arver` (inheriting the full version).

There is **no fake condensing**. Nothing is invented or truncated — the trimmed
text is whatever the trainer authors. Out of the box a short format includes all
slides at full timing (so the budget reads "over"); curating is the job the tool
supports.

## Data model
Format deltas live inside the existing slide JSONB blob (no DDL, no new table):

```jsonc
// bnimsp_slides.published / .draft
{
  "sayThis": "…full script…",
  "askGroup": "…full task…",
  "formats": {
    "90min":  { "include": true,  "sayThis": "trimmed…", "askGroup": "", "timing": "ca. 2 min" },
    "120min": { "include": false }
  }
}
```

- `include` defaults to `true` when absent. `full` always includes everything.
- Empty/absent `sayThis`/`askGroup`/`timing` inherit the full version.

## Code map
- `lib/bnimsp/types.ts` — `TrainingFormat`, `SlideFormatOverride`, `SlideFormats`,
  `Slide.formats`, `FORMAT_OVERRIDE_FIELDS`, `SHORT_FORMATS`.
- `lib/bnimsp/format.ts` — `resolveSlide`, `isIncluded`, `hasOverride`,
  `formatTotals`, labels/targets. Pure, shared client+server.
- `lib/bnimsp/content.ts` — `rowToSlide` carries `formats` through.
- `app/api/bnimsp/slides/[n]/route.ts` — `PATCH` accepts `format` to scope edits
  to `formats[format]`, plus an `include` boolean; size caps + concurrency intact.
- `components/bnimsp/FormatBar.tsx` — segmented switcher + budget read-out.
- `components/bnimsp/Studio.tsx` — filters/resolves slides by format, navigation
  steps over visible slides, `onEditLayer` routes delivery edits to the active
  format, `FormatSlideStrip` holds the per-slide include/timing controls.

Editing & publishing follow the normal flow: format deltas are written to the
slide **draft** and go live on **Publiser endringer** like any other content.

## Known limitations
- A short format starts with every slide included; the trainer curates down.
- Per-director personal scripts (`PersonalScript`) are per slide, not per format.
- Budget targets (180/120/90) are content-minutes; scheduled breaks aren't
  re-planned per format.
