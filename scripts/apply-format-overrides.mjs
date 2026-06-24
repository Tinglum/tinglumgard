/**
 * Apply curated per-format deltas (app/bnimsp/_data/format-overrides.json) to:
 *   1) the committed seed (app/bnimsp/_data/seed-content.json), and
 *   2) the live DB (bnimsp_slides.published + draft if present).
 *
 * Idempotent: merges formats into each slide's blob without touching other
 * fields. Run from the project root: `node scripts/apply-format-overrides.mjs`
 */
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const SEED = 'app/bnimsp/_data/seed-content.json'
const OVERRIDES = 'app/bnimsp/_data/format-overrides.json'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const overrides = JSON.parse(readFileSync(OVERRIDES, 'utf8')).slides || {}
const nums = Object.keys(overrides).map(Number).sort((a, b) => a - b)
console.log(`Overrides for ${nums.length} slides: ${nums.join(', ')}`)

// Merge { "120min": {...}, "90min": {...} } onto an existing formats object.
function mergeFormats(existing, incoming) {
  const out = { ...(existing || {}) }
  for (const fmt of ['120min', '90min']) {
    if (incoming[fmt]) out[fmt] = { ...(out[fmt] || {}), ...incoming[fmt] }
  }
  return out
}

// 1) Seed file -------------------------------------------------------------
const seed = JSON.parse(readFileSync(SEED, 'utf8'))
let seedTouched = 0
for (const s of seed.slides) {
  const ov = overrides[String(s.n)]
  if (!ov) continue
  s.formats = mergeFormats(s.formats, ov)
  seedTouched++
}
writeFileSync(SEED, JSON.stringify(seed, null, 2) + '\n')
console.log(`Seed updated: ${seedTouched} slides.`)

// 2) Live DB ---------------------------------------------------------------
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: rows, error } = await sb.from('bnimsp_slides').select('n, published, draft')
if (error) { console.error('DB read failed:', error.message); process.exit(1) }
if (!rows || rows.length === 0) { console.log('No DB rows (seed-only). Done.'); process.exit(0) }

let dbTouched = 0
for (const row of rows) {
  const ov = overrides[String(row.n)]
  if (!ov) continue
  const update = {}
  if (row.published) update.published = { ...row.published, formats: mergeFormats(row.published.formats, ov) }
  if (row.draft) update.draft = { ...row.draft, formats: mergeFormats(row.draft.formats, ov) }
  if (Object.keys(update).length === 0) continue
  update.updated_at = new Date().toISOString()
  const { error: upErr } = await sb.from('bnimsp_slides').update(update).eq('n', row.n)
  if (upErr) { console.error(`Slide ${row.n} update failed:`, upErr.message); continue }
  dbTouched++
}
console.log(`DB updated: ${dbTouched} slides. Done.`)
