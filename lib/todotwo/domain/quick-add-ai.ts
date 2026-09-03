import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
// See lib/todotwo/domain/assignment-ai.ts for why this one file imports
// 'zod/v4' rather than the repository's usual 'zod' — it is scoped to the
// schema fed to zodOutputFormat.
import { z } from 'zod/v4'

/**
 * Turning a typed or spoken sentence ("remind me to check the fence by the
 * north paddock tomorrow", "add feeding the new piglets to today's list,
 * assign to Amber") into a structured, reviewable task proposal.
 *
 * Same discipline as assignment-ai.ts: the model never writes anything. It
 * only reads free text against a roster of real people and real projects it
 * is handed, and proposes a title/description/date/assignee/project. Anything
 * it names that is not a real id in the given context is nulled out here,
 * never trusted — a wrong guess at "who" or "which project" would silently
 * misdirect or misfile a task, so the model only ever gets to propose, and
 * this file is what actually decides what survives.
 */

export interface QuickAddPerson {
  id: string
  name: string
}

export interface QuickAddProject {
  id: string
  name: string
}

export interface QuickAddContext {
  people: QuickAddPerson[]
  projects: QuickAddProject[]
  /** The server's current farm-local date, YYYY-MM-DD — what "today"/"tomorrow"/"next Tuesday" resolve against. */
  today: string
}

export interface ParsedQuickAddTask {
  title: string
  description: string | null
  /** YYYY-MM-DD, or null if no date was mentioned or resolvable. */
  dueDate: string | null
  assigneePersonId: string | null
  projectId: string | null
}

// ---------------------------------------------------------------------------
// What the model returns: a name/project label, never an id — see
// resolvePersonId / resolveProjectId below for why.
// ---------------------------------------------------------------------------

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')

const rawResultSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  dueDate: dateSchema.nullable(),
  /** Free-text name as spoken/typed, or null if nobody was mentioned. Matched against the roster in code, never trusted as an id. */
  assigneeName: z.string().nullable(),
  /** Free-text project/list name, or null if none was mentioned. Matched against the roster in code, never trusted as an id. */
  projectName: z.string().nullable(),
})

export type RawQuickAddResult = z.infer<typeof rawResultSchema>

// ---------------------------------------------------------------------------
// Resolution — pure, and the part that is unit tested without the API.
// ---------------------------------------------------------------------------

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Resolves a free-text name against a list of {id, name}. Exact
 * (case-insensitive) match, then a unique prefix match. Anything else — no
 * match, or an ambiguous one — resolves to null rather than a guess.
 */
function resolveByName<T extends { id: string; name: string }>(text: string | null, options: T[]): string | null {
  if (!text) return null
  const target = norm(text)
  if (!target) return null

  const exact = options.find((o) => norm(o.name) === target)
  if (exact) return exact.id

  const prefixMatches = options.filter(
    (o) => norm(o.name).startsWith(target) || target.startsWith(norm(o.name))
  )
  if (prefixMatches.length === 1) return prefixMatches[0].id

  return null
}

export function resolvePersonId(text: string | null, people: QuickAddPerson[]): string | null {
  return resolveByName(text, people)
}

export function resolveProjectId(text: string | null, projects: QuickAddProject[]): string | null {
  return resolveByName(text, projects)
}

/**
 * Turns the model's raw (name-based) output into a validated proposal. Pure
 * and synchronous — fully covered by unit tests without ever calling Claude.
 * Any assignee or project the model named that does not match a real id in
 * context is dropped (nulled), never invented or guessed at.
 */
export function resolveQuickAdd(raw: RawQuickAddResult, context: QuickAddContext): ParsedQuickAddTask {
  const title = raw.title.trim() || 'Untitled task'

  return {
    title,
    description: raw.description?.trim() || null,
    dueDate: raw.dueDate,
    assigneePersonId: resolvePersonId(raw.assigneeName, context.people),
    projectId: resolveProjectId(raw.projectName, context.projects),
  }
}

// ---------------------------------------------------------------------------
// The Claude call. Isolated behind this one function so tests exercise
// resolveQuickAdd directly and never need a real API key.
// ---------------------------------------------------------------------------

export class QuickAddAiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuickAddAiUnavailableError'
  }
}

function buildPrompt(text: string, context: QuickAddContext): string {
  const people = context.people.map((p) => `- ${p.name}`).join('\n') || '(no people on the roster)'
  const projects = context.projects.map((p) => `- ${p.name}`).join('\n') || '(no named projects)'

  return [
    'You turn one sentence of free text — typed or spoken — into a single structured task proposal.',
    '',
    'You never create anything. A separate program takes what you propose, checks it against the real',
    'roster below, and shows it to a person to confirm before anything is written.',
    '',
    `Today's date (server, farm-local) is ${context.today}. Resolve relative dates ("tomorrow", "next`,
    'Tuesday", "today", "in three days") against this date. If no date is mentioned or none can be',
    'confidently resolved, leave dueDate null rather than guessing.',
    '',
    'People on the roster (match a mentioned assignee against these EXACTLY as spelled here; if the text',
    'does not clearly name one of them, leave assigneeName null):',
    people,
    '',
    'Projects/lists (match a mentioned project against these EXACTLY as spelled here; if the text does not',
    'clearly name one of them, leave projectName null):',
    projects,
    '',
    'Produce:',
    '- title: a short, concrete task title (imperative, not a full transcript of the sentence).',
    '- description: any extra detail worth keeping that is not already in the title, else null.',
    '- dueDate: YYYY-MM-DD if resolvable, else null.',
    '- assigneeName: the roster name (spelled exactly as listed) of whoever the text asks to be assigned,',
    '  else null. Do not invent a name that is not on the roster.',
    '- projectName: the roster project/list name (spelled exactly as listed) the text names, else null. Do',
    '  not invent a project that is not on the roster.',
    '',
    'Text:',
    text,
  ].join('\n')
}

/**
 * Parses one free-text quick-add sentence into a ParsedQuickAddTask via
 * Claude, validated against the given people/project rosters. Throws only
 * when the AI layer itself cannot run (no API key, or the call failed), so
 * the caller can fail the request gracefully.
 */
export async function parseQuickAdd(text: string, context: QuickAddContext): Promise<ParsedQuickAddTask> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new QuickAddAiUnavailableError('Nothing to parse — the text was empty.')
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new QuickAddAiUnavailableError(
      'ANTHROPIC_API_KEY is not configured. Add it to the environment to use quick add.'
    )
  }

  const client = new Anthropic({ apiKey })

  let response
  try {
    response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(trimmed, context) }],
      output_config: {
        format: zodOutputFormat(rawResultSchema),
      },
    })
  } catch (error) {
    throw new QuickAddAiUnavailableError(
      `Could not reach the quick-add assistant: ${error instanceof Error ? error.message : 'unknown error'}`
    )
  }

  const parsed = response.parsed_output
  if (!parsed) {
    throw new QuickAddAiUnavailableError('The quick-add assistant returned something unusable. Try rephrasing.')
  }

  return resolveQuickAdd(parsed, context)
}
