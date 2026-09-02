import type { CsvRow } from '@/lib/todotwo/domain/csv'

/**
 * Turns a Todoist CSV export into a TodoTwo import plan.
 *
 * Pure: no database, no filesystem. The script wraps this; the rules live here
 * so they can be tested against the real export.
 *
 * The interesting work is not the mapping — it is the collapsing. In the farm's
 * Todoist, a daily routine exists as seven near-identical copies, one per
 * weekday, each with its own subtasks. "C Daily Animals" is 236 tasks and about
 * six actual routines. This flattens each set back into one task carrying an
 * RRULE, and reports every difference between the copies rather than silently
 * choosing a winner.
 *
 * People are deliberately not imported. AUTHOR and RESPONSIBLE are dropped, and
 * reminder rows (which exist only to name a person) are skipped. Assignment is
 * rebuilt in Phase 3 once Workawayers have accounts.
 */

export interface ImportTask {
  title: string
  description: string | null
  priority: number
  /** Original recurrence text, verbatim, in whatever language it was written. */
  recurrenceText: string | null
  recurrenceLang: 'en' | 'de' | 'no' | null
  /** Normalised rule, where the text could be understood. */
  rrule: string | null
  children: ImportTask[]
}

export interface ImportSection {
  name: string
  tasks: ImportTask[]
}

export interface ImportProject {
  name: string
  slug: string
  sections: ImportSection[]
  /** Tasks that appeared before any section header. */
  looseTasks: ImportTask[]
}

export interface DriftNote {
  project: string
  section: string
  title: string
  kind: 'subtask-count' | 'subtask-wording' | 'duplicate-weekday' | 'missing-weekday' | 'unparsed-rule'
  detail: string
}

export interface ImportPlan {
  project: ImportProject
  drift: DriftNote[]
  stats: {
    rowsRead: number
    tasksBeforeCollapse: number
    tasksAfterCollapse: number
    remindersSkipped: number
  }
}

const WEEKDAYS: Record<string, string> = {
  // English, including the abbreviations Todoist accepts.
  mon: 'MO', monday: 'MO', mo: 'MO',
  tue: 'TU', tues: 'TU', tuesday: 'TU',
  wed: 'WE', wednesday: 'WE',
  thu: 'TH', thur: 'TH', thurs: 'TH', thursday: 'TH',
  fri: 'FR', friday: 'FR',
  sat: 'SA', saturday: 'SA',
  sun: 'SU', sunday: 'SU',
  // German — Anna writes "jeden Mo".
  di: 'TU', mi: 'WE', do: 'TH', fr: 'FR', sa: 'SA', so: 'SU',
  montag: 'MO', dienstag: 'TU', mittwoch: 'WE', donnerstag: 'TH',
  freitag: 'FR', samstag: 'SA', sonntag: 'SU',
  // Norwegian, for rules typed later.
  man: 'MO', mandag: 'MO', tirsdag: 'TU', onsdag: 'WE',
  tor: 'TH', torsdag: 'TH', fredag: 'FR', lordag: 'SA', sondag: 'SU',
}

/** Extracts a weekday code from a Todoist recurrence string, if it names one. */
export function weekdayOf(text: string): string | null {
  const cleaned = text.toLowerCase().replace(/[øö]/g, 'o').replace(/[åä]/g, 'a')
  // Longest names first so "sunday" is not matched as "sun" inside "sunday".
  const names = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length)
  for (const name of names) {
    if (new RegExp(`\\b${name}\\b`).test(cleaned)) return WEEKDAYS[name]
  }
  return null
}

/** Extracts HH:MM from "at 10am", "at 18", "at 07:00", "at 2 pm". */
export function timeOf(text: string): string | null {
  const at = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(text)
  if (!at) return null

  let hour = Number(at[1])
  const minute = at[2] ? Number(at[2]) : 0
  const meridiem = at[3]?.toLowerCase()

  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** True for rules this importer does not attempt to normalise. */
export function isComplexRule(text: string): boolean {
  const t = text.toLowerCase()
  return (
    t.includes('other') || // "every other day", "every other Wednesday"
    /\bjeden\s+\d/.test(t) || // "jeden 1. Mo"
    t.includes('month') ||
    t.includes('year')
  )
}

/**
 * Builds an RRULE from a set of weekday codes and an optional time.
 * Returns null when there is nothing reliable to say.
 */
export function buildRrule(days: string[], time: string | null): string | null {
  if (days.length === 0) return null

  const order = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const unique = Array.from(new Set(days)).sort((a, b) => order.indexOf(a) - order.indexOf(b))

  // All seven days is a daily rule, which reads better and generates the same set.
  const parts =
    unique.length === 7 ? ['FREQ=DAILY'] : ['FREQ=WEEKLY', `BYDAY=${unique.join(',')}`]

  if (time) {
    const [hh, mm] = time.split(':')
    parts.push(`BYHOUR=${Number(hh)}`, `BYMINUTE=${Number(mm)}`)
  }

  return `RRULE:${parts.join(';')}`
}

function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim()
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Strips Todoist's sort prefix: "A Tinglum Farm TASKS" → "Tinglum Farm TASKS". */
export function cleanProjectName(fileName: string): string {
  return fileName
    .replace(/\.csv$/i, '')
    .replace(/^[A-Z]\s+/, '')
    .trim()
}

export function buildImportPlan(rows: CsvRow[], fileName: string): ImportPlan {
  const projectName = cleanProjectName(fileName)
  const drift: DriftNote[] = []

  let remindersSkipped = 0
  let tasksBeforeCollapse = 0

  const sections: ImportSection[] = []
  const looseTasks: ImportTask[] = []

  let currentSection: ImportSection | null = null
  // Stack of the most recent task at each indent level.
  const stack: ImportTask[] = []

  for (const row of rows) {
    const type = row.TYPE?.trim()

    if (type === 'section') {
      currentSection = { name: row.CONTENT.trim(), tasks: [] }
      sections.push(currentSection)
      stack.length = 0
      continue
    }

    if (type === 'reminder') {
      // Reminders exist only to name a person. Phase 6 owns notifications.
      remindersSkipped += 1
      continue
    }

    if (type !== 'task') continue // meta, project_note, blank separators

    const title = row.CONTENT?.trim()
    if (!title) continue

    tasksBeforeCollapse += 1

    const indent = Math.max(1, Number(row.INDENT) || 1)
    const priorityRaw = Number(row.PRIORITY)
    const dateText = row.DATE?.trim() || null
    const lang = (row.DATE_LANG?.trim() || null) as ImportTask['recurrenceLang']

    const task: ImportTask = {
      title,
      description: row.DESCRIPTION?.trim() || null,
      // Todoist's own numbering, 1 urgent to 4 default. Anything odd falls back.
      priority: priorityRaw >= 1 && priorityRaw <= 4 ? priorityRaw : 4,
      recurrenceText: dateText,
      recurrenceLang: lang && ['en', 'de', 'no'].includes(lang) ? lang : null,
      rrule: null,
      children: [],
    }

    stack.length = indent - 1
    const parent = stack[indent - 2]

    if (parent) {
      parent.children.push(task)
    } else if (currentSection) {
      currentSection.tasks.push(task)
    } else {
      looseTasks.push(task)
    }

    stack[indent - 1] = task
  }

  for (const section of sections) {
    section.tasks = collapseRoutines(section.tasks, projectName, section.name, drift)
  }

  const collapsedLoose = collapseRoutines(looseTasks, projectName, '(no section)', drift)

  const tasksAfterCollapse =
    sections.reduce((sum, s) => sum + countTasks(s.tasks), 0) + countTasks(collapsedLoose)

  return {
    project: {
      name: projectName,
      slug: slugify(projectName),
      sections,
      looseTasks: collapsedLoose,
    },
    drift,
    stats: {
      rowsRead: rows.length,
      tasksBeforeCollapse,
      tasksAfterCollapse,
      remindersSkipped,
    },
  }
}

function countTasks(tasks: ImportTask[]): number {
  return tasks.reduce((sum, task) => sum + 1 + countTasks(task.children), 0)
}

/**
 * Merges the weekday copies of one routine into a single task with an RRULE.
 *
 * Where the copies disagree — different subtask counts, different wording, a
 * weekday duplicated or missing — the most complete copy wins and the
 * difference is recorded. Silently picking one would bury exactly the drift
 * this migration is meant to surface.
 */
function collapseRoutines(
  tasks: ImportTask[],
  projectName: string,
  sectionName: string,
  drift: DriftNote[]
): ImportTask[] {
  const groups = new Map<string, ImportTask[]>()
  const order: string[] = []

  for (const task of tasks) {
    const key = normaliseTitle(task.title)
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(task)
  }

  const result: ImportTask[] = []

  for (const key of order) {
    const group = groups.get(key)!

    if (group.length === 1) {
      const only = group[0]
      only.rrule = ruleFor([only], projectName, sectionName, drift)
      only.children = collapseRoutines(only.children, projectName, sectionName, drift)
      result.push(only)
      continue
    }

    // Most complete copy becomes canonical.
    const canonical = group.reduce((best, candidate) =>
      candidate.children.length > best.children.length ? candidate : best
    )

    const counts = group.map((t) => t.children.length)
    if (new Set(counts).size > 1) {
      drift.push({
        project: projectName,
        section: sectionName,
        title: canonical.title,
        kind: 'subtask-count',
        detail: `${group.length} weekday copies with differing subtask counts (${counts.join(', ')}); kept the copy with ${canonical.children.length}.`,
      })
    }

    const wordings = new Set(
      group.flatMap((t) => t.children.map((c) => normaliseTitle(c.title)))
    )
    const canonicalWordings = new Set(canonical.children.map((c) => normaliseTitle(c.title)))
    const missing = Array.from(wordings).filter((w) => !canonicalWordings.has(w))
    if (missing.length > 0) {
      drift.push({
        project: projectName,
        section: sectionName,
        title: canonical.title,
        kind: 'subtask-wording',
        detail: `Subtasks present in some copies but not the kept one: ${missing.slice(0, 5).join(' | ')}${missing.length > 5 ? ` (+${missing.length - 5} more)` : ''}`,
      })
    }

    canonical.rrule = ruleFor(group, projectName, sectionName, drift)
    canonical.recurrenceText = group
      .map((t) => t.recurrenceText)
      .filter(Boolean)
      .join(' / ')
    canonical.children = collapseRoutines(canonical.children, projectName, sectionName, drift)

    result.push(canonical)
  }

  return result
}

function ruleFor(
  group: ImportTask[],
  projectName: string,
  sectionName: string,
  drift: DriftNote[]
): string | null {
  const texts = group.map((t) => t.recurrenceText).filter((t): t is string => Boolean(t))
  if (texts.length === 0) return null

  const complex = texts.filter(isComplexRule)
  if (complex.length > 0) {
    drift.push({
      project: projectName,
      section: sectionName,
      title: group[0].title,
      kind: 'unparsed-rule',
      detail: `Kept verbatim, not converted to a rule: ${Array.from(new Set(complex)).join(' | ')}`,
    })
    return null
  }

  const days: string[] = []
  const seen = new Set<string>()
  let time: string | null = null

  for (const text of texts) {
    const day = weekdayOf(text)
    if (day) {
      if (seen.has(day)) {
        drift.push({
          project: projectName,
          section: sectionName,
          title: group[0].title,
          kind: 'duplicate-weekday',
          detail: `${day} appears more than once across the copies of this routine.`,
        })
      }
      seen.add(day)
      days.push(day)
    }
    time = time ?? timeOf(text)
  }

  if (days.length > 1 && days.length < 7) {
    const all = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    const absent = all.filter((d) => !seen.has(d))
    drift.push({
      project: projectName,
      section: sectionName,
      title: group[0].title,
      kind: 'missing-weekday',
      detail: `Runs on ${Array.from(seen).join(', ')}; no copy exists for ${absent.join(', ')}.`,
    })
  }

  return buildRrule(days, time)
}
