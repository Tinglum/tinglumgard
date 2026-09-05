import type { Constraint, Weekday } from '@/lib/todotwo/domain/assignment'
import { taskMatchesLabel } from '@/lib/todotwo/domain/assignment'

/**
 * Stored assignment rules, and how they become constraints.
 *
 * A rule has to survive to tomorrow, so it can never hold a task id — those
 * belong to one occurrence on one day. Anything task-shaped is stored as a
 * label and resolved against the day's actual work here, at the moment the
 * round runs. That is the whole difference between a rule and a one-off
 * instruction typed into the console.
 */

export type RuleKind =
  | 'same_person'
  | 'different_people'
  | 'unavailable_weekday'
  | 'max_per_day'
  | 'exclude_task_group'

export interface AssignmentRule {
  id: string
  label: string
  kind: RuleKind
  payload: Record<string, unknown>
  enabled: boolean
  sort_order: number
  source_text: string | null
}

/** Just enough of a task for a label to be matched against it. */
export interface RuleTask {
  id: string
  title: string
  groupLabel: string | null
}

export interface RuleResolution {
  constraints: Constraint[]
  /** Rules that matched nothing today. Reported, never silently dropped. */
  inert: { id: string; label: string; reason: string }[]
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/**
 * Turns the enabled rules into constraints for a particular day's work.
 *
 * `tasks` is only needed for exclude_task_group, which has to become concrete
 * task ids; everything else is label- or person-based and passes through.
 */
export function rulesToConstraints(rules: AssignmentRule[], tasks: RuleTask[]): RuleResolution {
  const constraints: Constraint[] = []
  const inert: RuleResolution['inert'] = []

  for (const rule of rules) {
    if (!rule.enabled) continue

    switch (rule.kind) {
      case 'same_person': {
        const labels = asStringArray(rule.payload.labels)
        if (labels.length === 0) {
          inert.push({ id: rule.id, label: rule.label, reason: 'no labels on the rule' })
          break
        }
        const matches = tasks.filter((t) => labels.some((l) => taskMatchesLabel(t, l)))
        if (matches.length < 2) {
          inert.push({
            id: rule.id,
            label: rule.label,
            reason:
              matches.length === 0
                ? 'nothing today matches those names'
                : 'only one task today matches, so there is nothing to bundle it with',
          })
          break
        }
        constraints.push({ kind: 'same_person', labels })
        break
      }

      case 'different_people': {
        const labelsA = asStringArray(rule.payload.labelsA)
        const labelsB = asStringArray(rule.payload.labelsB)
        if (labelsA.length === 0 || labelsB.length === 0) {
          inert.push({ id: rule.id, label: rule.label, reason: 'one side of the rule is empty' })
          break
        }
        const hasA = tasks.some((t) => labelsA.some((l) => taskMatchesLabel(t, l)))
        const hasB = tasks.some((t) => labelsB.some((l) => taskMatchesLabel(t, l)))
        if (!hasA || !hasB) {
          inert.push({
            id: rule.id,
            label: rule.label,
            reason: 'only one side of it exists today, so nothing can clash',
          })
          break
        }
        constraints.push({ kind: 'different_people', labelsA, labelsB })
        break
      }

      case 'unavailable_weekday': {
        const personId = typeof rule.payload.personId === 'string' ? rule.payload.personId : null
        const weekdays = asStringArray(rule.payload.weekdays) as Weekday[]
        if (!personId || weekdays.length === 0) {
          inert.push({ id: rule.id, label: rule.label, reason: 'no person or no weekdays' })
          break
        }
        constraints.push({ kind: 'unavailable_weekday', personId, weekdays })
        break
      }

      case 'max_per_day': {
        const personId = typeof rule.payload.personId === 'string' ? rule.payload.personId : null
        const limit = typeof rule.payload.limit === 'number' ? Math.floor(rule.payload.limit) : 0
        if (limit < 1) {
          inert.push({ id: rule.id, label: rule.label, reason: 'the limit is not a whole number above zero' })
          break
        }
        constraints.push({ kind: 'max_per_day', personId, limit })
        break
      }

      case 'exclude_task_group': {
        const personId = typeof rule.payload.personId === 'string' ? rule.payload.personId : null
        const label = typeof rule.payload.label === 'string' ? rule.payload.label : ''
        if (!personId || !label.trim()) {
          inert.push({ id: rule.id, label: rule.label, reason: 'no person or no task group' })
          break
        }
        // The stored label becomes today's task ids. A rule about work that
        // is not on today's list simply does not bind today.
        const taskIds = tasks.filter((t) => taskMatchesLabel(t, label)).map((t) => t.id)
        if (taskIds.length === 0) {
          inert.push({ id: rule.id, label: rule.label, reason: 'nothing today matches that group' })
          break
        }
        constraints.push({ kind: 'exclude_tasks', personId, taskIds })
        break
      }
    }
  }

  return { constraints, inert }
}

/** A plain-English line for a rule, for lists and for the preview. */
export function describeRule(rule: AssignmentRule, nameOf: (id: string) => string): string {
  switch (rule.kind) {
    case 'same_person':
      return `${asStringArray(rule.payload.labels).join(' and ')} — the same person`
    case 'different_people':
      return `${asStringArray(rule.payload.labelsA).join('/')} and ${asStringArray(
        rule.payload.labelsB
      ).join('/')} — different people`
    case 'unavailable_weekday':
      return `${nameOf(String(rule.payload.personId))} is off ${asStringArray(
        rule.payload.weekdays
      ).join(', ')}`
    case 'max_per_day':
      return rule.payload.personId
        ? `${nameOf(String(rule.payload.personId))} does no more than ${rule.payload.limit} a day`
        : `Nobody does more than ${rule.payload.limit} a day`
    case 'exclude_task_group':
      return `${nameOf(String(rule.payload.personId))} does no ${String(rule.payload.label)}`
    default:
      return rule.label
  }
}
