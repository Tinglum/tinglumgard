/**
 * ONE-OFF: imports Todoist CSV exports into TodoTwo PRODUCTION.
 *
 * This is a deliberate, explicit counterpart to `import-todoist.ts` (which
 * refuses to run against production). It never reads `.env.local` — it takes
 * its Supabase URL and service-role key only from PROD_TODOTWO_SUPABASE_URL /
 * PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY, so it can't accidentally be pointed
 * at dev, and can't be invoked by someone who only has `.env.local` set up.
 *
 * Dry run by default — prints the same kind of plan/diff summary as the dev
 * script. Pass --apply to write. Refuses to write unless the connected
 * project ref is exactly the known production ref.
 *
 *   PROD_TODOTWO_SUPABASE_URL=... PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/todotwo/import-todoist-to-production.ts "C:/Users/kenne/Downloads"
 *
 *   PROD_TODOTWO_SUPABASE_URL=... PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/todotwo/import-todoist-to-production.ts "C:/Users/kenne/Downloads" --apply
 *
 * Import/collapse logic is frozen and reused as-is from lib/todotwo/domain —
 * this script only reads CSVs, builds plans, prints them, and writes rows.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

import { parseCsv } from '../../lib/todotwo/domain/csv'
import { buildImportPlan, type ImportPlan, type ImportTask } from '../../lib/todotwo/domain/todoist-import'

const REQUIRED_PRODUCTION_REF = 'dofhlyvexecwlqmrzutd'

function fail(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const positional = args.filter((a) => !a.startsWith('--'))
const dir = positional[0]
const explicitFiles = positional.slice(1) // optional: restrict to specific filenames

if (!dir) {
  fail(
    'Usage: npx tsx scripts/todotwo/import-todoist-to-production.ts <directory> [file1.csv file2.csv ...] [--apply]'
  )
}
if (!fs.existsSync(dir)) fail(`Not a directory: ${dir}`)

const ALLOWED_FILES = new Set([
  'A Tinglum Farm TASKS.csv',
  'C Daily Animals.csv',
  'D Daily Housekeeping.csv',
])

const files = (
  explicitFiles.length > 0
    ? explicitFiles
    : fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith('.csv'))
        .filter((f) => ALLOWED_FILES.has(f))
).sort()

if (files.length === 0) fail(`No matching .csv files in ${dir}`)

for (const f of files) {
  if (!ALLOWED_FILES.has(f)) {
    fail(`${f} is not in the approved production import list: ${Array.from(ALLOWED_FILES).join(', ')}`)
  }
}

const plans: ImportPlan[] = files.map((file) => {
  const text = fs.readFileSync(path.join(dir, file), 'utf8')
  return buildImportPlan(parseCsv(text), file)
})

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`\n  ${apply ? 'IMPORTING TO PRODUCTION' : 'DRY RUN (production)'} — ${files.length} file(s) from ${dir}\n`)

let totalBefore = 0
let totalAfter = 0
let totalSeries = 0

for (const plan of plans) {
  const { project, stats } = plan
  totalBefore += stats.tasksBeforeCollapse
  totalAfter += stats.tasksAfterCollapse

  console.log(`  ${project.name}`)
  console.log(`    sections            ${project.sections.length}`)
  console.log(`    tasks in export     ${stats.tasksBeforeCollapse}`)
  console.log(`    after collapsing    ${stats.tasksAfterCollapse}`)
  console.log(`    reminders skipped   ${stats.remindersSkipped}`)

  const series = countSeries(project.sections.flatMap((s) => s.tasks).concat(project.looseTasks))
  totalSeries += series
  console.log(`    recurring routines  ${series}`)
  console.log()
}

console.log(`  TOTAL  ${totalBefore} tasks in Todoist  ->  ${totalAfter} in TodoTwo  (${totalSeries} recurring routines)\n`)

const allDrift = plans.flatMap((p) => p.drift)
if (allDrift.length > 0) {
  console.log(`  ${allDrift.length} difference(s) found between the weekday copies:\n`)
  for (const note of allDrift) {
    console.log(`    [${note.kind}] ${note.project} / ${note.section} / ${note.title}`)
    console.log(`      ${note.detail}`)
  }
  console.log()
}

function countSeries(tasks: ImportTask[]): number {
  return tasks.reduce((sum, t) => sum + (t.rrule ? 1 : 0) + countSeries(t.children), 0)
}

if (!apply) {
  console.log('  Nothing written. Re-run with --apply to import into PRODUCTION.\n')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

const url = process.env.PROD_TODOTWO_SUPABASE_URL
const serviceRoleKey = process.env.PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) {
  fail('Missing PROD_TODOTWO_SUPABASE_URL / PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY environment variables.')
}

const refMatch = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())
if (!refMatch) fail(`Not a Supabase project URL: ${url}`)
const connectedRef = refMatch[1]
if (connectedRef !== REQUIRED_PRODUCTION_REF) {
  fail(`Connected project is ${connectedRef}, expected production (${REQUIRED_PRODUCTION_REF}). Refusing to import.`)
}

const db = createClient(url, serviceRoleKey, {
  db: { schema: 'todotwo' },
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  for (const plan of plans) {
    const { project } = plan

    const { data: projectRow, error: projectError } = await db
      .from('projects')
      .upsert({ name: project.name, slug: project.slug, kind: 'list' }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (projectError || !projectRow) fail(`project ${project.name}: ${projectError?.message}`)
    const projectId = projectRow.id as string

    let sectionOrder = 0
    for (const section of project.sections) {
      sectionOrder += 10
      const { data: sectionRow, error: sectionError } = await db
        .from('sections')
        .insert({ project_id: projectId, name: section.name, sort_order: sectionOrder })
        .select('id')
        .single()

      if (sectionError || !sectionRow) fail(`section ${section.name}: ${sectionError?.message}`)

      await writeTasks(section.tasks, projectId, sectionRow.id as string)
    }

    await writeTasks(project.looseTasks, projectId, null)
    console.log(`  imported ${project.name}`)
  }

  console.log('\n  Done.\n')
}

async function writeTasks(tasks: ImportTask[], projectId: string, sectionId: string | null) {
  let order = 0
  for (const task of tasks) {
    order += 10

    if (task.rrule) {
      // A recurring routine becomes a series: one text, edited once.
      const { data: series, error } = await db
        .from('task_series')
        .insert({
          project_id: projectId,
          section_id: sectionId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          rrule: task.rrule,
          starts_on: new Date().toISOString().slice(0, 10),
          source_text: task.recurrenceText,
        })
        .select('id')
        .single()

      if (error || !series) fail(`series ${task.title}: ${error?.message}`)

      let stepOrder = 0
      for (const child of task.children) {
        stepOrder += 10
        const { error: stepError } = await db.from('task_series_steps').insert({
          series_id: series.id as string,
          title: child.title,
          description: child.description,
          sort_order: stepOrder,
        })
        if (stepError) fail(`step ${child.title}: ${stepError.message}`)
      }
      continue
    }

    // A one-off task.
    const { data: row, error } = await db
      .from('tasks')
      .insert({
        project_id: projectId,
        section_id: sectionId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        recurrence_text: task.recurrenceText,
        recurrence_lang: task.recurrenceLang,
        sort_order: order,
        status: 'unassigned',
      })
      .select('id')
      .single()

    if (error || !row) fail(`task ${task.title}: ${error?.message}`)

    if (task.children.length > 0) {
      await writeSubtasks(task.children, row.id as string, projectId, sectionId)
    }
  }
}

async function writeSubtasks(
  tasks: ImportTask[],
  parentId: string,
  projectId: string,
  sectionId: string | null
) {
  let order = 0
  for (const task of tasks) {
    order += 10
    const { data: row, error } = await db
      .from('tasks')
      .insert({
        project_id: projectId,
        section_id: sectionId,
        parent_task_id: parentId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        sort_order: order,
        status: 'unassigned',
      })
      .select('id')
      .single()

    if (error || !row) fail(`subtask ${task.title}: ${error?.message}`)
    if (task.children.length > 0) {
      await writeSubtasks(task.children, row.id as string, projectId, sectionId)
    }
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
