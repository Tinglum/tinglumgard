import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
// The SDK's structured-output helper is built against the zod/v4 API surface
// specifically (see node_modules/@anthropic-ai/sdk/helpers/zod.d.ts) — the
// installed zod (3.25.x) ships that surface at this subpath. Everywhere else
// in the repository imports plain 'zod' (the v3-compatible default export);
// this file is the one exception, scoped to the schema fed to zodOutputFormat.
import { z } from 'zod/v4'

import type { Constraint, Weekday } from '@/lib/todotwo/domain/assignment'

/**
 * Turning "Robert does no housekeeping, and Amber is off Thursday and Friday"
 * into Constraint[] the deterministic solver in assignment.ts can run.
 *
 * The model never assigns anyone to anything. It only reads free text against
 * a roster of real people and real task groups it is handed, and produces the
 * five constraint shapes assignment.ts already knows how to enforce. Anything
 * it cannot confidently map to a real person or a real task group is reported
 * back as unresolved rather than guessed at — a wrong guess here would be a
 * silent rule nobody agreed to, which is worse than no rule at all.
 */

const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export interface RosterPerson {
  id: string
  name: string
}

export interface RosterTask {
  id: string
  title: string
  /** Series title / project name — what "housekeeping tasks" is matched against. */
  groupLabel: string | null
}

export interface ParseContext {
  people: RosterPerson[]
  tasks: RosterTask[]
}

export interface UnresolvedReference {
  /** The text from the instruction that could not be confidently mapped. */
  text: string
  /** What kind of thing it was supposed to name. */
  kind: 'person' | 'task_group'
  /** A close match, when there is one worth offering. */
  suggestion: string | null
}

export interface ParseConstraintsResult {
  constraints: Constraint[]
  unresolved: UnresolvedReference[]
  /** Plain-English restatement of what was understood, for the preview screen. */
  summary: string
}

// ---------------------------------------------------------------------------
// What the model returns: names and labels, never IDs. It cannot know a UUID,
// so asking it for one only invites a fabricated one.
// ---------------------------------------------------------------------------

const weekdaySchema = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')

const rawConstraintSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('unavailable_weekday'),
    personName: z.string(),
    weekdays: z.array(weekdaySchema).min(1),
  }),
  z.object({
    kind: z.literal('unavailable_dates'),
    personName: z.string(),
    dates: z.array(dateSchema).min(1),
  }),
  z.object({
    kind: z.literal('exclude_tasks'),
    personName: z.string(),
    taskGroupLabel: z.string(),
  }),
  z.object({
    kind: z.literal('only_people'),
    taskGroupLabel: z.string(),
    personNames: z.array(z.string()).min(1),
  }),
  z.object({
    kind: z.literal('max_per_day'),
    /** Null means "nobody" — the limit applies to everyone. */
    personName: z.string().nullable(),
    limit: z.number().int().min(1),
  }),
])

const rawResultSchema = z.object({
  constraints: z.array(rawConstraintSchema),
  /** Anything in the text that named a person or task group the model was not
   *  given, or could not confidently match. Reported, not guessed. */
  unresolvedMentions: z.array(
    z.object({
      text: z.string(),
      kind: z.enum(['person', 'task_group']),
    })
  ),
  summary: z.string(),
})

type RawConstraint = z.infer<typeof rawConstraintSchema>

// ---------------------------------------------------------------------------
// Name resolution — pure, and the part that is unit tested without the API.
// ---------------------------------------------------------------------------

/** Case- and whitespace-insensitive edit distance, for "did you mean" only. */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Resolves a free-text name against the roster.
 *
 * Exact (case-insensitive) match wins. A unique prefix match ("Rob" against
 * only "Robert") is accepted. Anything else is unresolved, with the closest
 * roster name offered as a suggestion only when it is close enough to be
 * useful — a wild guess is worse than admitting the miss.
 */
export function resolvePerson(
  name: string,
  people: RosterPerson[]
): { person: RosterPerson | null; suggestion: string | null } {
  const target = norm(name)

  const exact = people.find((p) => norm(p.name) === target)
  if (exact) return { person: exact, suggestion: null }

  const prefixMatches = people.filter((p) => norm(p.name).startsWith(target) || target.startsWith(norm(p.name)))
  if (prefixMatches.length === 1) return { person: prefixMatches[0], suggestion: null }

  let best: RosterPerson | null = null
  let bestDistance = Infinity
  for (const person of people) {
    const distance = levenshtein(target, norm(person.name))
    if (distance < bestDistance) {
      bestDistance = distance
      best = person
    }
  }

  // Close enough to be worth a "did you mean", not close enough to trust.
  const suggestion = best && bestDistance <= Math.max(2, Math.ceil(target.length * 0.34)) ? best.name : null

  return { person: null, suggestion }
}

/**
 * Resolves a task-group label ("housekeeping tasks", "Kitchen") against the
 * roster of tasks in the assignment window. Matches on the group label first
 * (a series/project name), falling back to the task title, both
 * case-insensitively and by substring in either direction — "housekeeping"
 * should catch "Daily Housekeeping".
 *
 * Returns every matching task ID. An empty match is unresolved rather than an
 * empty (and therefore silently inert) constraint.
 */
export function resolveTaskGroup(
  label: string,
  tasks: RosterTask[]
): { taskIds: string[]; suggestion: string | null } {
  const target = norm(label)

  const matches = tasks.filter((t) => {
    const group = t.groupLabel ? norm(t.groupLabel) : null
    const title = norm(t.title)
    return (
      (group && (group.includes(target) || target.includes(group))) ||
      title.includes(target) ||
      target.includes(title)
    )
  })

  if (matches.length > 0) {
    return { taskIds: Array.from(new Set(matches.map((t) => t.id))), suggestion: null }
  }

  const labels = Array.from(new Set(tasks.map((t) => t.groupLabel).filter((v): v is string => !!v)))
  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of labels) {
    const distance = levenshtein(target, norm(candidate))
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  const suggestion = best && bestDistance <= Math.max(2, Math.ceil(target.length * 0.34)) ? best : null

  return { taskIds: [], suggestion }
}

/**
 * Turns the model's name/label-based output into real Constraint objects,
 * flagging anything that could not be resolved. Pure and synchronous, so it is
 * fully covered by unit tests without ever calling Claude.
 */
export function resolveConstraints(
  raw: RawConstraint[],
  extraMentions: { text: string; kind: 'person' | 'task_group' }[],
  context: ParseContext
): { constraints: Constraint[]; unresolved: UnresolvedReference[] } {
  const constraints: Constraint[] = []
  const unresolved: UnresolvedReference[] = []

  for (const c of raw) {
    switch (c.kind) {
      case 'unavailable_weekday': {
        const { person, suggestion } = resolvePerson(c.personName, context.people)
        if (!person) {
          unresolved.push({ text: c.personName, kind: 'person', suggestion })
          break
        }
        constraints.push({ kind: 'unavailable_weekday', personId: person.id, weekdays: c.weekdays })
        break
      }

      case 'unavailable_dates': {
        const { person, suggestion } = resolvePerson(c.personName, context.people)
        if (!person) {
          unresolved.push({ text: c.personName, kind: 'person', suggestion })
          break
        }
        constraints.push({ kind: 'unavailable_dates', personId: person.id, dates: c.dates })
        break
      }

      case 'exclude_tasks': {
        const { person, suggestion: personSuggestion } = resolvePerson(c.personName, context.people)
        if (!person) {
          unresolved.push({ text: c.personName, kind: 'person', suggestion: personSuggestion })
          break
        }
        const { taskIds, suggestion: taskSuggestion } = resolveTaskGroup(c.taskGroupLabel, context.tasks)
        if (taskIds.length === 0) {
          unresolved.push({ text: c.taskGroupLabel, kind: 'task_group', suggestion: taskSuggestion })
          break
        }
        constraints.push({ kind: 'exclude_tasks', personId: person.id, taskIds })
        break
      }

      case 'only_people': {
        const { taskIds, suggestion: taskSuggestion } = resolveTaskGroup(c.taskGroupLabel, context.tasks)
        if (taskIds.length === 0) {
          unresolved.push({ text: c.taskGroupLabel, kind: 'task_group', suggestion: taskSuggestion })
          break
        }
        const personIds: string[] = []
        let anyUnresolved = false
        for (const name of c.personNames) {
          const { person, suggestion } = resolvePerson(name, context.people)
          if (!person) {
            unresolved.push({ text: name, kind: 'person', suggestion })
            anyUnresolved = true
            continue
          }
          personIds.push(person.id)
        }
        if (!anyUnresolved && personIds.length > 0) {
          constraints.push({ kind: 'only_people', taskIds, personIds })
        }
        break
      }

      case 'max_per_day': {
        if (c.personName === null) {
          constraints.push({ kind: 'max_per_day', personId: null, limit: c.limit })
          break
        }
        const { person, suggestion } = resolvePerson(c.personName, context.people)
        if (!person) {
          unresolved.push({ text: c.personName, kind: 'person', suggestion })
          break
        }
        constraints.push({ kind: 'max_per_day', personId: person.id, limit: c.limit })
        break
      }
    }
  }

  for (const mention of extraMentions) {
    unresolved.push({ text: mention.text, kind: mention.kind, suggestion: null })
  }

  return { constraints, unresolved }
}

// ---------------------------------------------------------------------------
// The Claude call. Isolated behind this one function so tests exercise
// resolveConstraints directly and never need a real API key.
// ---------------------------------------------------------------------------

export class AssignmentAiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssignmentAiUnavailableError'
  }
}

function buildPrompt(text: string, context: ParseContext): string {
  const people = context.people.map((p) => `- ${p.name}`).join('\n') || '(no people on the roster)'
  const groups = Array.from(new Set(context.tasks.map((t) => t.groupLabel).filter((v): v is string => !!v)))
  const groupList = groups.length > 0 ? groups.map((g) => `- ${g}`).join('\n') : '(no named task groups)'
  const titles = Array.from(new Set(context.tasks.map((t) => t.title))).slice(0, 40)
  const titleList = titles.length > 0 ? titles.map((t) => `- ${t}`).join('\n') : '(no tasks in this window)'

  return [
    'You translate a farm coordinator\'s free-text scheduling instructions into structured constraints.',
    '',
    'You never decide who is assigned to what — a separate, deterministic program does the actual assigning.',
    'Your only job is to read the instructions and produce the constraints they describe, using ONLY the people',
    'and task groups listed below. Do not invent a person or task group that is not listed.',
    '',
    'People on the roster:',
    people,
    '',
    'Task groups (series or project names) in this window:',
    groupList,
    '',
    'Individual task titles, for reference:',
    titleList,
    '',
    'The five kinds of constraint you may produce:',
    '- unavailable_weekday: a person is off certain weekdays every week (MO/TU/WE/TH/FR/SA/SU).',
    '- unavailable_dates: a person is away on specific calendar dates (YYYY-MM-DD). Resolve relative dates',
    '  ("next Tuesday", "the 12th to the 15th") against the instruction text itself; if a date cannot be',
    '  determined, leave that part out rather than guessing a date.',
    '- exclude_tasks: a person never does a named task group.',
    '- only_people: a named task group is restricted to specific people.',
    '- max_per_day: nobody (or one named person) does more than N tasks in a day.',
    '',
    'A plain "divide all tasks evenly" with no restrictions produces an empty constraints array — that is',
    'already what the solver does by default.',
    '',
    'Use personName / personNames exactly as spelled on the roster above once you have matched them — do not',
    'correct a misspelling in the instruction text yourself, match it as best you can and use the roster name.',
    'If a name or task group in the instruction does not clearly match anything on the roster, do NOT invent a',
    'constraint for it — instead add it to unresolvedMentions with the text as written and whether it named a',
    'person or a task group.',
    '',
    'Write a short, plain-English summary of what you understood, one sentence per constraint.',
    '',
    'Instruction:',
    text,
  ].join('\n')
}

/**
 * Parses free text into Constraint[] via Claude, resolved against the given
 * roster. Never throws for a merely confusing instruction — that comes back
 * as `unresolved`. Throws only when the AI layer itself cannot run (no API
 * key, or the call failed), so the caller can fail the page gracefully rather
 * than crash it.
 */
export async function parseConstraints(
  text: string,
  context: ParseContext
): Promise<ParseConstraintsResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { constraints: [], unresolved: [], summary: 'No instructions given — nothing to constrain.' }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new AssignmentAiUnavailableError(
      'ANTHROPIC_API_KEY is not configured. Add it to the environment to use free-text assignment.'
    )
  }

  const client = new Anthropic({ apiKey })

  let response
  try {
    response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(trimmed, context) }],
      output_config: {
        format: zodOutputFormat(rawResultSchema),
      },
    })
  } catch (error) {
    throw new AssignmentAiUnavailableError(
      `Could not reach the assignment assistant: ${error instanceof Error ? error.message : 'unknown error'}`
    )
  }

  const parsed = response.parsed_output
  if (!parsed) {
    throw new AssignmentAiUnavailableError('The assignment assistant returned something unusable. Try rephrasing.')
  }

  const { constraints, unresolved } = resolveConstraints(parsed.constraints, parsed.unresolvedMentions, context)

  return { constraints, unresolved, summary: parsed.summary }
}

export { WEEKDAYS }
