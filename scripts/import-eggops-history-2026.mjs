import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function splitSellable(total) {
  const sellable = Math.round(total * 0.6)
  const tooSmall = Math.round(total * 0.25)
  const dirty = Math.max(0, total - sellable - tooSmall)
  return { sellable, tooSmall, dirty }
}

function isMissingMiscColumnError(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes("Could not find the 'duck_eggs' column") ||
    message.includes("Could not find the 'other_eggs' column")
  )
}

const rows = [
  ['2026-01-11', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-01-12', 4, 0, 1, 1, 1, 0, 0, 7],
  ['2026-01-13', 3, 1, 1, 1, 2, 0, 1, 9],
  ['2026-01-14', 1, 0, 0, 1, 1, 0, 2, 5],
  ['2026-01-15', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-01-16', 6, 3, 8, 2, 3, 0, 4, 26],
  ['2026-01-17', 0, 0, 0, 0, 1, 0, 1, 2],
  ['2026-01-18', 5, 8, 1, 2, 3, 0, 0, 19],
  ['2026-01-19', 1, 4, 3, 2, 0, 0, 2, 12],
  ['2026-01-20', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-01-21', 3, 4, 0, 3, 0, 0, 0, 10],
  ['2026-01-22', 2, 4, 1, 1, 4, 0, 4, 16],
  ['2026-01-23', 3, 3, 0, 3, 0, 0, 2, 11],
  ['2026-01-24', 4, 4, 1, 0, 1, 0, 0, 10],
  ['2026-01-25', 2, 9, 5, 3, 0, 7, 0, 26],
  ['2026-01-26', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-01-27', 3, 4, 3, 3, 3, 6, 0, 22],
  ['2026-01-28', 1, 1, 2, 1, 3, 3, 0, 11],
  ['2026-01-29', 7, 6, 8, 1, 3, 5, 1, 31],
  ['2026-01-30', 2, 3, 1, 2, 1, 3, 3, 15],
  ['2026-01-31', 4, 5, 6, 0, 2, 3, 4, 24],
  ['2026-02-01', 6, 4, 2, 2, 2, 2, 1, 19],
  ['2026-02-02', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-02-03', 4, 4, 2, 3, 1, 2, 0, 16],
  ['2026-02-04', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-02-05', 3, 2, 2, 1, 1, 2, 0, 11],
  ['2026-02-06', 1, 2, 1, 2, 0, 5, 0, 11],
  ['2026-02-07', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-02-08', 1, 0, 2, 2, 0, 0, 3, 8],
  ['2026-02-09', 1, 1, 0, 2, 0, 7, 4, 15],
  ['2026-02-10', 0, 0, 0, 0, 0, 0, 0, 0],
  ['2026-02-11', 0, 6, 3, 2, 1, 4, 0, 16],
  ['2026-02-12', 3, 1, 0, 2, 1, 1, 5, 13],
  ['2026-02-13', 0, 0, 1, 0, 2, 3, 0, 6],
  ['2026-02-14', 3, 0, 5, 2, 2, 0, 0, 12],
  ['2026-02-15', 3, 12, 2, 1, 5, 0, 4, 27],
  ['2026-02-16', 3, 4, 4, 3, 3, 3, 3, 23],
  ['2026-02-17', 2, 3, 2, 3, 4, 3, 1, 18],
  ['2026-02-18', 1, 0, 2, 0, 1, 1, 2, 7],
  ['2026-02-19', 0, 0, 5, 2, 3, 0, 1, 11],
  ['2026-02-20', 0, 0, 2, 2, 7, 3, 8, 22],
  ['2026-02-21', 0, 0, 5, 4, 4, 2, 2, 17],
  ['2026-02-22', 6, 0, 1, 3, 3, 8, 1, 22],
  ['2026-02-23', 5, 16, 4, 4, 5, 1, 2, 37],
  ['2026-02-24', 2, 5, 4, 2, 5, 6, 2, 26],
  ['2026-02-25', 1, 4, 6, 1, 1, 2, 7, 22],
  ['2026-02-26', 1, 1, 6, 3, 5, 4, 4, 24],
  ['2026-02-27', 3, 6, 1, 3, 3, 4, 4, 24],
  ['2026-02-28', 1, 4, 2, 2, 4, 4, 4, 21],
  ['2026-03-01', 2, 1, 4, 1, 5, 3, 4, 20],
  ['2026-03-02', 0, 5, 5, 5, 7, 2, 4, 28],
  ['2026-03-03', 4, 1, 3, 3, 3, 5, 4, 23],
  ['2026-03-04', 0, 3, 5, 2, 5, 3, 4, 22],
  ['2026-03-05', 0, 2, 2, 1, 5, 4, 3, 17],
  ['2026-03-06', 5, 7, 2, 3, 5, 3, 0, 25],
  ['2026-03-07', 4, 0, 6, 3, 4, 5, 3, 25],
  ['2026-03-08', 2, 6, 2, 2, 4, 4, 0, 20],
  ['2026-03-09', 2, 3, 5, 2, 2, 4, 3, 21],
]

const codes = ['AC', 'SB', 'CL', 'MA', 'JG']

async function main() {
  loadLocalEnv()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  for (const [date, ac, sb, cl, ma, jg, duck, other, total] of rows) {
    const sum = ac + sb + cl + ma + jg + duck + other
    if (sum !== total) {
      throw new Error(`Row total mismatch on ${date}: expected ${total}, got ${sum}`)
    }
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: breeds, error: breedError } = await supabase
    .from('egg_breeds')
    .select('id, slug, name')
    .in('slug', [
      'ayam-cemani',
      'silverudds-bla',
      'silverudds',
      'silverudd-s-bla',
      'cream-legbar',
      'maran',
      'jersey-giant',
    ])

  if (breedError) throw breedError

  const findBySlug = (slug) => (breeds || []).find((b) => b.slug === slug)?.id || null
  const breedMap = {
    AC: findBySlug('ayam-cemani'),
    SB: findBySlug('silverudds-bla') || findBySlug('silverudds') || findBySlug('silverudd-s-bla'),
    CL: findBySlug('cream-legbar'),
    MA: findBySlug('maran'),
    JG: findBySlug('jersey-giant'),
  }

  const missingCodes = Object.entries(breedMap)
    .filter(([, id]) => !id)
    .map(([code]) => code)

  if (missingCodes.length > 0) {
    throw new Error(`Missing egg breed mapping for codes: ${missingCodes.join(', ')}`)
  }

  const dailyRows = []
  const dayStateRows = []

  for (const [collectionDate, ac, sb, cl, ma, jg, duckEggs, otherEggs] of rows) {
    const byCode = { AC: ac, SB: sb, CL: cl, MA: ma, JG: jg }
    for (const code of codes) {
      const total = byCode[code]
      if (!total || total <= 0) continue
      const split = splitSellable(total)
      dailyRows.push({
        collection_date: collectionDate,
        breed_id: breedMap[code],
        total_collected: total,
        sellable_standard: split.sellable,
        too_small: split.tooSmall,
        dirty: split.dirty,
        cracked: 0,
        shell_defect: 0,
        other_unsellable: 0,
        notes: 'Historical import Jan-Mar 2026 (60/25/15 split)',
        created_by: 'seed:eggops-history-2026',
        updated_by: 'seed:eggops-history-2026',
      })
    }

    if ((duckEggs || 0) > 0 || (otherEggs || 0) > 0) {
      dayStateRows.push({
        collection_date: collectionDate,
        duck_eggs: duckEggs || 0,
        other_eggs: otherEggs || 0,
      })
    }
  }

  const { data: upsertedDaily, error: dailyError } = await supabase
    .from('egg_daily_collections')
    .upsert(dailyRows, { onConflict: 'collection_date,breed_id' })
    .select('id')

  if (dailyError) throw dailyError

  let dayStateResult = { count: 0, error: null }
  if (dayStateRows.length > 0) {
    const { data, error } = await supabase
      .from('egg_ops_day_states')
      .upsert(dayStateRows, { onConflict: 'collection_date' })
      .select('id')

    dayStateResult = { count: (data || []).length, error }
  }

  if (dayStateResult.error) {
    if (isMissingMiscColumnError(dayStateResult.error)) {
      const fallbackRows = dayStateRows.map((row) => ({ collection_date: row.collection_date }))
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('egg_ops_day_states')
        .upsert(fallbackRows, { onConflict: 'collection_date' })
        .select('id')

      if (fallbackError) {
        throw fallbackError
      }

      dayStateResult = {
        count: (fallbackData || []).length,
        error: null,
      }

      console.warn(
        "Inserted daily rows. Duck/other day-state columns are missing in schema cache, so misc counts were not written yet. Run migration + NOTIFY pgrst, 'reload schema'; then re-run this script."
      )
    } else {
      throw dayStateResult.error
    }
  }

  console.log(`Imported daily rows: ${upsertedDaily?.length || 0}`)
  console.log(`Upserted day-state misc rows: ${dayStateResult.count}`)
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exit(1)
})
