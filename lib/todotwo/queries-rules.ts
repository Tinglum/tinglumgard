import { getTodoTwoClient } from '@/lib/todotwo/db'
import type { AssignmentRule } from '@/lib/todotwo/domain/assignment-rules'

/** The farm's standing assignment rules, in the order they are shown and applied. */
export async function getAssignmentRules(): Promise<AssignmentRule[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('assignment_rules')
    .select('id, label, kind, payload, enabled, sort_order, source_text')
    .order('sort_order')

  if (error) throw new Error(`Could not load the assignment rules: ${error.message}`)
  return (data ?? []) as AssignmentRule[]
}
