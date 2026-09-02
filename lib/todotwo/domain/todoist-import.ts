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
  kind:
    | 'gap-filled'
    | 'duplicate-removed'
    | 'subtasks-merged'
    | 'conflicting-instructions'
    | 'schedule-kept'
    | 'unparsed-rule'
  detail: string
  /** true when the importer changed something; false when it only observed. */
  fixed: boolean
}

/**
 * A routine missing exactly one weekday is an oversight — four of the farm's
 * routines are missing Tuesday and nothing else, and the Kitchen routine has
 * two Wednesdays instead of a Tuesday. A routine running two or three days is a
 * schedule, not a gap, so it is left alone and reported.
 */
const GAP_FILL_THRESHOLD = 6

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

/** Words that carry no meaning when deciding whether two subtasks are the same. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'if', 'is', 'it',
])

function contentWords(title: string): Set<string> {
  return new Set(
    normaliseTitle(title)
      .replace(/[^a-z0-9æøå ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  )
}

/**
 * Are these two subtask titles the same instruction, worded differently?
 *
 * The export is full of near-misses: "Feed the piglets and Hilary & Eleonore"
 * against "Feed the piglets and Hilary and Eleonore", and a warm dish listing
 * "patties" one day and "moose meat patties" the next. Treating those as
 * different subtasks would carry the drift into TodoTwo instead of removing it.
 */
export function isSameInstruction(a: string, b: string): boolean {
  const left = normaliseTitle(a)
  const right = normaliseTitle(b)
  if (left === right) return true

  const wordsA = contentWords(a)
  const wordsB = contentWords(b)
  if (wordsA.size === 0 || wordsB.size === 0) return false

  let shared = 0
  wordsA.forEach((w) => {
    if (wordsB.has(w)) shared += 1
  })

  // Overlap against the smaller set: "make one warm dish, ... patties" is
  // wholly contained in the version that also says "moose meat".
  return shared / Math.min(wordsA.size, wordsB.size) >= 0.8
}

/**
 * Merges the subtasks of every weekday copy into one list.
 *
 * Union, not "the most complete copy wins" — otherwise a subtask that exists
 * only on Thursday is silently dropped. Where two copies word the same
 * instruction differently, the longer wording is kept: it is almost always the
 * more specific one.
 */
function mergeSubtasks(
  copies: ImportTask[],
  projectName: string,
  sectionName: string,
  parentTitle: string,
  drift: DriftNote[]
): ImportTask[] {
  const merged: ImportTask[] = []
  const conflicts: string[] = []
  let addedFromLaterCopies = 0

  copies.forEach((copy, copyIndex) => {
    for (const child of copy.children) {
      const existing = merged.find((m) => isSameInstruction(m.title, child.title))

      if (!existing) {
        merged.push({ ...child, children: [...child.children] })
        if (copyIndex > 0) addedFromLaterCopies += 1
        continue
      }

      // Keep the more specific wording.
      if (child.title.length > existing.title.length) existing.title = child.title

      // Instructions that genuinely differ cannot be reconciled by a machine:
      // one copy says two scoops, another says one. Keep the longer and report.
      if (child.description && existing.description && child.description !== existing.description) {
        conflicts.push(existing.title)
        if (child.description.length > existing.description.length) {
          existing.description = child.description
        }
      } else if (child.description && !existing.description) {
        existing.description = child.description
      }

      existing.children = mergeSubtasks(
        [existing, child],
        projectName,
        sectionName,
        existing.title,
        drift
      )
    }
  })

  if (addedFromLaterCopies > 0) {
    drift.push({
      project: projectName,
      section: sectionName,
      title: parentTitle,
      kind: 'subtasks-merged',
      detail: `Merged the subtasks of ${copies.length} weekday copies; ${addedFromLaterCopies} step(s) existed on some days only and now run every day.`,
      fixed: true,
    })
  }

  const uniqueConflicts = Array.from(new Set(conflicts))
  if (uniqueConflicts.length > 0) {
    drift.push({
      project: projectName,
      section: sectionName,
      title: parentTitle,
      kind: 'conflicting-instructions',
      detail: `Same step, different instructions on different days — kept the longest, please check: ${uniqueConflicts.join(' | ')}`,
      fixed: false,
    })
  }

  return merged
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

    // Canonical shell: the copy with the most detail in its own description.
    const canonical = group.reduce((best, candidate) =>
      (candidate.description?.length ?? 0) > (best.description?.length ?? 0) ? candidate : best
    )

    canonical.children = mergeSubtasks(group, projectName, sectionName, canonical.title, drift)
    canonical.rrule = ruleFor(group, projectName, sectionName, drift)
    canonical.recurrenceText = Array.from(
      new Set(group.map((t) => t.recurrenceText).filter(Boolean))
    ).join(' / ')

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
      detail: `Kept verbatim rather than guessed at: ${Array.from(new Set(complex)).join(' | ')}`,
      fixed: false,
    })
    return null
  }

  const ALL_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  let time: string | null = null

  for (const text of texts) {
    const day = weekdayOf(text)
    if (day) {
      if (seen.has(day)) duplicates.add(day)
      seen.add(day)
    }
    time = time ?? timeOf(text)
  }

  if (seen.size === 0) return null

  if (duplicates.size > 0) {
    drift.push({
      project: projectName,
      section: sectionName,
      title: group[0].title,
      kind: 'duplicate-removed',
      detail: `${Array.from(duplicates).join(', ')} was listed more than once; the copies are now one rule.`,
      fixed: true,
    })
  }

  const missing = ALL_DAYS.filter((d) => !seen.has(d))

  if (missing.length > 0 && seen.size >= GAP_FILL_THRESHOLD) {
    // One weekday absent from an otherwise daily routine is an oversight.
    missing.forEach((d) => seen.add(d))
    drift.push({
      project: projectName,
      section: sectionName,
      title: group[0].title,
      kind: 'gap-filled',
      detail: `No copy existed for ${missing.join(', ')} although the routine ran every other day. Now runs daily.`,
      fixed: true,
    })
  } else if (missing.length > 0 && seen.size > 1) {
    // Two or three days a week is a schedule, not a gap. Left alone.
    drift.push({
      project: projectName,
      section: sectionName,
      title: group[0].title,
      kind: 'schedule-kept',
      detail: `Runs ${Array.from(seen).join(', ')} only. Left as written — confirm this is the intended schedule rather than a gap.`,
      fixed: false,
    })
  }

  return buildRrule(Array.from(seen), time)
}
