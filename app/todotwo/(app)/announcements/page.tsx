import { AnnouncementCard } from '@/components/todotwo/announcements/announcement-card'
import { AnnouncementComposer } from '@/components/todotwo/announcements/announcement-composer'
import { EmptyState } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getAnnouncements } from '@/lib/todotwo/notifications/queries'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const

/**
 * The noticeboard.
 *
 * Everyone signed in reads it. Whether drafts and delivery counts appear is
 * decided by Row Level Security, not by this page — the composer is the only
 * thing gated in TypeScript, and only because there is no point rendering a
 * form whose insert the database would refuse.
 */
export default async function AnnouncementsPage() {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/announcements`)
  const announcements = await getAnnouncements(principal.person.id)

  const isStaff = principal.roles.some((role) =>
    (STAFF_ROLES as readonly string[]).includes(role)
  )

  const unread = announcements.filter(
    (announcement) => announcement.publishedAt && !announcement.acknowledgedByMe
  ).length

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Announcements</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {announcements.length === 0
            ? 'Nothing has been posted yet.'
            : unread === 0
              ? 'You have read everything here.'
              : `${unread} you have not marked as read.`}
        </p>
      </header>

      {isStaff ? <AnnouncementComposer authorPersonId={principal.person.id} /> : null}

      {announcements.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="Notices about the farm show up here, and everyone with an account gets an email when one is published."
        />
      ) : null}

      <div className="flex flex-col gap-4">
        {announcements.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            personId={principal.person.id}
          />
        ))}
      </div>
    </div>
  )
}
