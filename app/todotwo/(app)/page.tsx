import { TodayWorkspace } from '@/components/todotwo/tasks/today-workspace'
import { copy, format, UI_LOCALE } from '@/lib/todotwo/copy'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getActiveBarnNote, getToday } from '@/lib/todotwo/queries'
import { getOpenHelpRequests } from '@/lib/todotwo/queries-help'
import { FARM_TZ, farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

/**
 * Today — fast, scannable daily hub with instant client switching between
 * My Day, Farm Team ("who is doing what"), and This Week, plus active Barn
 * Notes and Morning / Afternoon / Evening time-of-day grouping.
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
      everyoneYesterday,
      olderOpenCount,
      weeklyTasks,
      projects,
      dailySeriesIds,
    },
    helpRequests,
    barnNote,
  ] = await Promise.all([
    getToday(principal.person.id, today),
    getOpenHelpRequests(principal.person.id),
    getActiveBarnNote(principal.person.id),
  ])

  const now = new Date()
  const dateHeading = new Intl.DateTimeFormat(UI_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: FARM_TZ,
  }).format(now)

  const farmHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: FARM_TZ,
    }).format(now)
  )

  const greeting = format(copy.overview.greeting, { name: displayName(principal.person) })

  return (
    <TodayWorkspace
      dateHeading={dateHeading}
      greeting={greeting}
      today={today}
      farmHour={Number.isNaN(farmHour) ? 12 : farmHour}
      currentPerson={{
        id: principal.person.id,
        fullName: principal.person.fullName,
        preferredName: principal.person.preferredName,
        photoUrl: principal.person.photoUrl,
      }}
      canManageProjects={principal.isAdmin || principal.roles.includes('coordinator')}
      initialBarnNote={barnNote}
      initialOverdue={overdue}
      initialMine={mine}
      initialUnclaimed={unclaimed}
      initialDoneToday={doneToday}
      initialEveryoneToday={everyoneToday}
      initialEveryoneYesterday={everyoneYesterday}
      initialWeeklyTasks={weeklyTasks}
      initialProjects={projects}
      initialHelpRequests={helpRequests}
      dailySeriesIds={dailySeriesIds}
      olderOpenCount={olderOpenCount}
    />
  )
}
