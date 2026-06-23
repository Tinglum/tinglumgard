# BNIMSP Improvements — Files Changed & New

## Quick Reference

### New Files (Created)
- ✨ `lib/bnimsp/hooks.ts` — useUnsavedWarning hook
- ✨ `app/api/bnimsp/publish-diff/route.ts` — Publish diff endpoint
- ✨ `app/api/bnimsp/slides/[n]/versions/route.ts` — Version history & revert
- ✨ `components/bnimsp/SlideVersionHistory.tsx` — Version history UI component
- ✨ `supabase/migrations/20260623000000_bnimsp_version_history.sql` — Version table & trigger
- 📄 `BNIMSP_IMPROVEMENTS_CHANGELOG.md` — Detailed changelog
- 📄 `BNIMSP_FINAL_SUMMARY.md` — Full implementation summary
- 📄 `BNIMSP_FILES_CHANGED.md` — This file

### Modified Files (Code Changes)

#### Type Definitions
- **`lib/bnimsp/types.ts`**
  - Added `updated_at?: string` to Slide interface
  - Exported `EDITABLE_SLIDE_FIELDS` constant (replaces hardcoded array)
  - Added `EditableSlideField` type
  - Added `FIELD_LIMITS` dictionary for per-field max lengths

#### Content Loading & Caching
- **`lib/bnimsp/content.ts`**
  - Wrapped `loadContent` in React `cache()` for per-request deduplication
  - Enhanced error logging: distinguish "table missing" vs "query error"
  - Updated `rowToSlide` to include `updated_at` field

#### API Routes

- **`app/api/bnimsp/slides/[n]/route.ts`** (PATCH)
  - Removed hardcoded `EDITABLE` array; now uses `EDITABLE_SLIDE_FIELDS`
  - Added field size validation using `FIELD_LIMITS`
  - Implemented optimistic concurrency: accepts `updatedAt`, returns 409 on conflict
  - Fixed publish bug: `published: row?.published || null` (not `|| base`)

- **`app/api/bnimsp/notes/[n]/route.ts`** (PUT)
  - Added field size validation (notes: 20k, script: 30k)

- **`app/api/bnimsp/content/route.ts`** (GET)
  - Added Cache-Control headers: 5 min for published, no-cache for draft

- **`app/api/bnimsp/publish/route.ts`** (POST)
  - Added RPC attempt for atomic publish (`bnimsp_publish_all`)
  - Fallback to batch updates if RPC unavailable

#### Components

- **`components/bnimsp/EditableText.tsx`**
  - Added `autosaveTimer` ref for debounced saves
  - Added `saveError` state with error display
  - Implemented autosave: 1.2s debounce, error rollback
  - Enhanced commit: keeps textarea open on error, improved error messages

- **`components/bnimsp/Studio.tsx`**
  - Imported `useUnsavedWarning` hook
  - Added `hasPendingSave` state for unsaved warning
  - Updated `persist` callback to track pending saves
  - Enhanced `onEditLayer`: passes `updatedAt`, handles 409 conflicts with reload
  - Integrated unsaved navigation warning via `useUnsavedWarning`

- **`components/bnimsp/AdminBar.tsx`**
  - Added `DiffItem` interface
  - Added state for diff modal: `showDiff`, `diffs`
  - Added `showPublishDiff()` function to fetch and display diff
  - Updated publish button: now shows diff preview first
  - Added full-screen diff modal with publish confirmation

- **`components/bnimsp/SlideStage.tsx`**
  - Added `canEdit?: boolean` prop
  - Imported `SlideVersionHistory` component
  - Integrated version history button (shown for editors only)

---

## Impact by Feature

### Concurrency & Data Integrity (#6, #7, #8)
- **`lib/bnimsp/types.ts`**: Slide type with updated_at
- **`lib/bnimsp/content.ts`**: Include updated_at in content loader
- **`app/api/bnimsp/slides/[n]/route.ts`**: Conflict detection & fixed publish bug
- **`components/bnimsp/Studio.tsx`**: Pass updatedAt, handle 409

### Validation & Safety (#9, #10)
- **`lib/bnimsp/types.ts`**: EDITABLE_SLIDE_FIELDS & FIELD_LIMITS
- **`app/api/bnimsp/slides/[n]/route.ts`**: Validate against limits
- **`app/api/bnimsp/notes/[n]/route.ts`**: Field size caps

### Performance & Visibility (#11, #12, #13)
- **`lib/bnimsp/content.ts`**: Cache() wrapper, better error logging
- **`app/api/bnimsp/content/route.ts`**: Cache-Control headers

### Editor UX (#15, #16, #17)
- **`components/bnimsp/EditableText.tsx`**: Autosave + rollback
- **`components/bnimsp/Studio.tsx`**: Unsaved warning + save tracking
- **`lib/bnimsp/hooks.ts`**: useUnsavedWarning hook

### Admin Features & Versioning (#18, #19)
- **`app/api/bnimsp/publish-diff/route.ts`**: New diff endpoint
- **`app/api/bnimsp/slides/[n]/versions/route.ts`**: New version endpoints
- **`components/bnimsp/AdminBar.tsx`**: Diff preview modal
- **`components/bnimsp/SlideVersionHistory.tsx`**: Version history UI
- **`components/bnimsp/SlideStage.tsx`**: Integrated version button
- **`supabase/migrations/20260623000000_bnimsp_version_history.sql`**: Version table & trigger

---

## Testing Locations

| Feature | Component | How to Test |
|---------|-----------|-------------|
| Autosave | EditableText | Click field, type, wait 1.2s for save |
| Rollback | EditableText | Disconnect network, type, wait for error + rollback |
| Concurrency | Studio | Edit in two tabs, 409 should reload page |
| Unsaved warning | Studio | Edit, close tab → browser prompt appears |
| Publish diff | AdminBar | Click "Publiser endringer" → modal shows diff |
| Version history | SlideStage | Click "Versjonhistorikk" (editor only) → list versions |
| Caching | Network tab | Load published content → Cache-Control header visible |

---

## Deployment Order

1. Run migration: `20260623000000_bnimsp_version_history.sql`
2. Deploy code (all modified + new components)
3. Test features in order:
   - Autosave → Rollback → Unsaved warning
   - Publish diff
   - Version history
   - Concurrency (two-tab test)
4. Monitor logs for `[bnimsp-content]` errors

---

## Code Review Checklist

- [ ] All `EDITABLE` references now use `EDITABLE_SLIDE_FIELDS`
- [ ] `FIELD_LIMITS` validation in place (PATCH + PUT)
- [ ] Slide PATCH never sets `published: base` (fixed #8 bug)
- [ ] `updated_at` included in Slide interface & content loader
- [ ] EditableText autosave rollback implemented
- [ ] Studio passes `updatedAt` in onEditLayer
- [ ] Studio handles 409 with user alert + reload
- [ ] AdminBar diff preview modal works
- [ ] SlideVersionHistory component integrated into SlideStage
- [ ] Migration creates table + trigger correctly
- [ ] Version endpoints GET/POST working

---

## Rollback Plan

If issues arise:

1. **Autosave problems**: Disable in EditableText (remove autosave timer logic)
2. **Concurrency issues**: Remove updatedAt check in PATCH (still validates fields)
3. **Version history**: Skip migration, remove version components from UI
4. **Cache issues**: Remove Cache-Control headers from content route

All changes are non-breaking; previous functionality works without new features.
