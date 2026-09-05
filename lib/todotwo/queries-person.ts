import { getTodoTwoClient } from '@/lib/todotwo/db'

/**
 * One person, for the page where staff change or remove them.
 *
 * Separate from queries.ts's getPeople, which is a list view and deliberately
 * lean. This one carries the fields an edit form needs and the counts a
 * permanent delete needs to be honest about.
 */

export interface PersonDetail {
  id: string
  full_name: string
  preferred_name: string | null
  email: string | null
  phone: string | null
  photo_url: string | null
  is_active: boolean
  farm_start_date: string | null
  auth_user_id: string | null
  deleted_at: string | null
  roles: string[]
}

/**
 * What a permanent delete would take with it.
 *
 * Most tables that point at a person are ON DELETE CASCADE, so removing the
 * row removes their whole record of work on the farm — and completed tasks,
 * which only hold completed_by_person_id ON DELETE SET NULL, quietly lose who
 * did them. Nobody should be asked to confirm that against an abstract
 * warning; they should see the numbers.
 */
export interface PersonFootprint {
  assignments: number
  completedTasks: number
  stays: number
  timeOff: number
  skills: number
  privateNotes: number
}

export async function getPerson(id: string): Promise<PersonDetail | null> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('people')
    .select(
      'id, full_name, preferred_name, email, phone, photo_url, is_active, farm_start_date, auth_user_id, deleted_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Could not load that person: ${error.message}`)
  if (!data) return null

  const { data: roleRows } = await db
    .from('role_assignments')
    .select('role')
    .eq('person_id', id)
    .is('revoked_at', null)

  return {
    ...(data as Omit<PersonDetail, 'roles'>),
    roles: ((roleRows ?? []) as { role: string }[]).map((r) => r.role),
  }
}

export async function getPersonFootprint(id: string): Promise<PersonFootprint> {
  const db = getTodoTwoClient()

  const count = async (table: string, column = 'person_id') => {
    const { count: n } = await db
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(column, id)
    return n ?? 0
  }

  const [assignments, completedTasks, stays, timeOff, skills, privateNotes] = await Promise.all([
    count('task_assignments'),
    count('tasks', 'completed_by_person_id'),
    count('stays'),
    count('time_off_requests'),
    count('person_skills'),
    // Not readable, only countable — the contents stay private even from an
    // admin (see admin_delete_private_notes).
    count('task_private_notes'),
  ])

  return { assignments, completedTasks, stays, timeOff, skills, privateNotes }
}
