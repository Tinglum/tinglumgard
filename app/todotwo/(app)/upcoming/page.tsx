import { WeekPlanner } from '@/components/todotwo/tasks/week-planner'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import {
  getFavoriteViews,
  getDaysOffSchedule,
  getToday,
  getUpcoming,
} from '@/lib/todotwo/queries'
import { farmToday } from '@/lib/todotwo/time'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function UpcomingPage() {
  const principal = await requireTodoTwoUser(todoTwoRoutes.upcoming())
  const isStaff = principal.isAdmin || principal.roles.includes('coordinator')
  const today = farmToday()

  const [upcomingGroups, favorites, daysOffSchedule, todayData] = await Promise.all([
    getUpcoming(6, today),
    getFavoriteViews(principal.person.id, isStaff),
    getDaysOffSchedule(),
    getToday(principal.person.id, today),
  ])

  const todayTasks = [
    ...todayData.everyoneToday,
    ...todayData.unclaimed,
  ]

  const visibleGroups = [
    { date: today, tasks: todayTasks },
    ...upcomingGroups.map((group, index) => ({
      ...group,
      // The automatic rota covers four upcoming days. Later generated
      // occurrences are preparation data, not actionable work yet.
      tasks: group.tasks.filter((task) => Boolean(task.assignee) || index < 4),
    })),
  ]

  return (
    <WeekPlanner
      today={today}
      currentPerson={{
        id: principal.person.id,
        fullName: principal.person.fullName,
        preferredName: principal.person.preferredName,
        photoUrl: principal.person.photoUrl,
      }}
      farmPeople={todayData.farmPeople}
      canManageProjects={isStaff}
      initialGroups={visibleGroups}
      initialWeeklyTasks={todayData.weeklyTasks}
      initialProjects={todayData.projects}
      daysOffSchedule={daysOffSchedule}
      showEveryoneDaysOff={isStaff}
      favorites={favorites}
    />
  )
}
