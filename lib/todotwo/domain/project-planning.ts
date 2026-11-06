import { farmWeek } from './weekly-projects'
import { farmDayStart, formatFarm } from '@/lib/todotwo/time'

export interface ProjectPlan {
  planned_week?: string | null
  due_date: string | null
  due_date_certainty?: 'definite' | 'approximate'
}

export function plannedThisWeek(task: ProjectPlan, today: string): boolean {
  const week = farmWeek(today)
  return task.planned_week === week.start || Boolean(task.due_date && task.due_date >= week.start && task.due_date <= week.end)
}

export function projectPlanLabel(task: ProjectPlan): string {
  const week = task.planned_week ? `Week of ${formatFarm(farmDayStart(task.planned_week), 'd MMM yyyy')}` : ''
  const due = task.due_date ? `${task.due_date_certainty === 'approximate' ? 'Approximate target' : 'Definite deadline'} · ${formatFarm(farmDayStart(task.due_date), 'EEE d MMM yyyy')}` : ''
  return [week, due].filter(Boolean).join(' · ') || 'To do later · no week or deadline set'
}
