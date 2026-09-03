/**
 * One-time content restructuring: split the once-daily Chickens+Ducks, Goats,
 * Pigs, and Rabbits routines into separate morning/evening series (each with
 * its own subtasks), and add a new Liam (the dog) morning/evening feeding +
 * walk routine.
 *
 * Goats already had its evening steps embedded in the single daily list with
 * an "EVENING" marker row — this splits exactly along that marker. The other
 * three groups had no such split, so per the brief ("a double set of
 * subtasks, one for morning and one for evening") their existing step list is
 * duplicated into both new series unchanged.
 *
 * The four old series are stopped (ends_on = yesterday) rather than deleted,
 * so their history stays intact; their not-yet-happened future occurrences
 * are cancelled so nobody sees a duplicate old-style task alongside the new
 * morning/evening pair.
 *
 * Dry run by default. --apply to write. Reads credentials the same way the
 * production import scripts do: PROD_TODOTWO_SUPABASE_URL /
 * PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY when set, otherwise falls back to
 * .env.local's dev credentials — so the SAME script verifies against dev
 * first and then runs against production with different env vars, exactly
 * like scripts/todotwo/import-todoist-to-production.ts.
 */
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PRODUCTION_REF = 'dofhlyvexecwlqmrzutd'

function fail(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const apply = process.argv.includes('--apply')

const url = process.env.PROD_TODOTWO_SUPABASE_URL || process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
const key = process.env.PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY || process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) fail('Missing Supabase URL/service-role key.')

const ref = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())?.[1]
const targetingProduction = ref === PRODUCTION_REF

const db = createClient(url, key, {
  db: { schema: 'todotwo' },
  auth: { autoRefreshToken: false, persistSession: false },
})

interface OldRoutine {
  title: string
  morningSteps: string[]
  eveningSteps: string[]
}

const OLD_ROUTINES: OldRoutine[] = [
  {
    title: 'Chickens + Ducks',
    morningSteps: [
      'Lights',
      'Roosters',
      'Food/water',
      'Eggs',
      'Check in on the baby chickens',
      'Change the water of the ducks every other day',
      'Rake hay in the barn and put it with the ducks',
    ],
    eveningSteps: [
      'Lights',
      'Roosters',
      'Food/water',
      'Eggs',
      'Check in on the baby chickens',
      'Change the water of the ducks every other day',
      'Rake hay in the barn and put it with the ducks',
    ],
  },
  {
    title: 'Goats',
    // Split exactly along the original "EVENING" marker step.
    morningSteps: [
      'Food/water',
      'Milking the Goats',
      'Check on the goats',
      'Clean the Goat Coops after milking',
      'Check Fence',
    ],
    eveningSteps: ['Milk the Goats'],
  },
  {
    title: 'Pigs',
    morningSteps: [
      'Feed the piglets and Hilary and Eleonore',
      'Feed George and Teddy down by the river at the other bridge.',
      'Jacky',
      'Feed the 13 teenage pigs',
    ],
    eveningSteps: [
      'Feed the piglets and Hilary and Eleonore',
      'Feed George and Teddy down by the river at the other bridge.',
      'Jacky',
      'Feed the 13 teenage pigs',
    ],
  },
  {
    title: 'Rabbits',
    morningSteps: ['Food and water for Rabbits', 'Cleaning'],
    eveningSteps: ['Food and water for Rabbits', 'Cleaning'],
  },
]

// The real steps from the existing "Liam" daily series (Todoist import),
// duplicated into both new times the same way as the other three routines
// with no explicit AM/PM marker.
const LIAM_STEPS = [
  'Food/water',
  'Walk',
  'Cleaning',
  'Practice tricks',
  'Clear some hair from his body 20min',
  'Take food from the fridge x2',
]
const LIAM_OLD_SERIES_TITLE = 'Liam'

async function main() {
  console.log(`\n  ${apply ? 'APPLYING' : 'DRY RUN'} — ${url} ${targetingProduction ? '(PRODUCTION)' : '(not production)'}\n`)

  const { data: dailyAnimals, error: projErr } = await db
    .from('projects')
    .select('id')
    .ilike('name', '%daily animals%')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (projErr || !dailyAnimals) fail(`Could not find the "Daily Animals" project: ${projErr?.message}`)
  const projectId = dailyAnimals.id as string

  const titlesToRetire = [...OLD_ROUTINES.map((r) => r.title), LIAM_OLD_SERIES_TITLE]

  const { data: oldSeriesRows, error: seriesErr } = await db
    .from('task_series')
    .select('id, title')
    .in('title', titlesToRetire)
    .is('deleted_at', null)
  if (seriesErr) fail(seriesErr.message)

  const byTitle = new Map((oldSeriesRows ?? []).map((r) => [r.title as string, r.id as string]))
  for (const title of titlesToRetire) {
    if (!byTitle.has(title)) fail(`Could not find an existing series titled "${title}"`)
  }

  console.log('  Old series found:')
  for (const [title, id] of Array.from(byTitle)) console.log(`    ${title} -> ${id}`)

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const plan: { series: { title: string; rrule: string }; steps: string[] }[] = []
  for (const r of OLD_ROUTINES) {
    plan.push({ series: { title: `${r.title} (Morning)`, rrule: 'RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=0' }, steps: r.morningSteps })
    plan.push({ series: { title: `${r.title} (Evening)`, rrule: 'RRULE:FREQ=DAILY;BYHOUR=18;BYMINUTE=0' }, steps: r.eveningSteps })
  }
  plan.push({ series: { title: 'Liam (Morning)', rrule: 'RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=30' }, steps: LIAM_STEPS })
  plan.push({ series: { title: 'Liam (Evening)', rrule: 'RRULE:FREQ=DAILY;BYHOUR=18;BYMINUTE=30' }, steps: LIAM_STEPS })

  console.log(`\n  Will create ${plan.length} new series:`)
  for (const p of plan) console.log(`    ${p.series.title} — ${p.series.rrule} — ${p.steps.length} step(s)`)

  const oldIds = Array.from(byTitle.values())
  const { count: futureCount } = await db
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .in('series_id', oldIds)
    .gte('occurrence_date', today)
    .not('status', 'in', '(completed,verified,cancelled)')

  console.log(`\n  Will stop the 4 old series (ends_on = ${yesterday}) and cancel ${futureCount ?? 0} not-yet-done future occurrence(s) from them.\n`)

  if (!apply) {
    console.log('  Dry run only — nothing written. Re-run with --apply to write.\n')
    return
  }

  // Stop the old series from generating any more occurrences.
  const { error: stopErr } = await db.from('task_series').update({ ends_on: yesterday }).in('id', oldIds)
  if (stopErr) fail(`Failed to stop old series: ${stopErr.message}`)

  // Cancel their future, not-yet-done occurrences so nothing duplicates the new pairs.
  const { error: cancelErr } = await db
    .from('tasks')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: 'Split into separate morning/evening routines' })
    .in('series_id', oldIds)
    .gte('occurrence_date', today)
    .not('status', 'in', '(completed,verified,cancelled)')
  if (cancelErr) fail(`Failed to cancel future occurrences: ${cancelErr.message}`)

  // Create the new series + their steps.
  for (const p of plan) {
    const { data: created, error: createErr } = await db
      .from('task_series')
      .insert({
        title: p.series.title,
        rrule: p.series.rrule,
        project_id: projectId,
        starts_on: today,
        priority: 4,
      })
      .select('id')
      .single()
    if (createErr || !created) fail(`Failed to create series "${p.series.title}": ${createErr?.message}`)

    const stepRows = p.steps.map((title, i) => ({
      series_id: created.id as string,
      title,
      sort_order: i,
    }))
    const { error: stepsErr } = await db.from('task_series_steps').insert(stepRows)
    if (stepsErr) fail(`Failed to create steps for "${p.series.title}": ${stepsErr.message}`)

    console.log(`  Created "${p.series.title}" (${created.id}) with ${stepRows.length} step(s)`)
  }

  console.log('\n  Done. Run `npm run todotwo:generate` (or the production equivalent) to materialize dated occurrences for the new series.\n')
}

main()
