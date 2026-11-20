import { TodayWorkspace } from '@/components/todotwo/tasks/today-workspace'
import { copy, format, UI_LOCALE } from '@/lib/todotwo/copy'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getToday } from '@/lib/todotwo/queries'
import { getOpenHelpRequests } from '@/lib/todotwo/queries-help'
import { FARM_TZ, farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

/**
 * Today — fast, scannable daily hub with instant client switching between
 * My Day, Farm Team ("who is doing what"), and This Week.
 *
 * Notice we no longer call getDailySeriesIds() as an extra sequential round
 * trip: getToday() already queries task_series and returns dailySeriesIds.
 */
export default async function TodayPage() {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)
  const today = farmToday()
  const [
    {
      overdue,
      mine,
      unclaimed,
      doneToday,
      everyoneToday,
      olderOpenCount,
      weeklyTasks,
      projects,
      dailySeriesIds,
    },
    helpRequests,
  ] = await Promise.all([
    getToday(principal.person.id, today),
    getOpenHelpRequests(principal.person.id),
  ])

  const dateHeading = new Intl.DateTimeFormat(UI_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: FARM_TZ,
  }).format(new Date())

  const greeting = format(copy.overview.greeting, { name: displayName(principal.person) })

  return (
    <TodayWorkspace
      dateHeading={dateHeading}
      greeting={greeting}
      today={today}
      currentPerson={{
        id: principal.person.id,
        fullName: principal.person.fullName,
        preferredName: principal.person.preferredName,
        photoUrl: principal.person.photoUrl,
      }}
      canManageProjects={principal.isAdmin || principal.roles.includes('coordinator')}
      initialOverdue={overdue}
      initialMine={mine}
      initialUnclaimed={unclaimed}
      initialDoneToday={doneToday}
      initialEveryoneToday={everyoneToday}
      initialWeeklyTasks={weeklyTasks}
      initialProjects={projects}
      initialHelpRequests={helpRequests}
      dailySeriesIds={dailySeriesIds}
      olderOpenCount={olderOpenCount}
    />
  )
}
