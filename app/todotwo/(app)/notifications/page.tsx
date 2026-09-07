import Link from 'next/link'
import { Bell, ChevronRight } from 'lucide-react'

import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getActivityFeed } from '@/lib/todotwo/notifications/activity'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import { FARM_TZ } from '@/lib/todotwo/time'
import { UI_LOCALE } from '@/lib/todotwo/copy'

export const dynamic = 'force-dynamic'

function when(value: string): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FARM_TZ,
  }).format(new Date(value))
}

export default async function NotificationsPage() {
  await requireTodoTwoUser(`${TODOTWO_BASE}/notifications`)
  const items = await getActivityFeed()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--tt-accent)]" aria-hidden="true" />
          <h1 className="text-2xl">Notifications</h1>
        </div>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Farm changes, new work, requests for help, and messages sent to you.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState title="No notifications yet" description="Changes around the farm will appear here." />
      ) : (
        <Surface className="px-4">
          <ul className="list-none">
            {items.map((item) => {
              const content = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-[14px] font-medium">{item.title}</p>
                      <time className="text-[11px] text-[var(--tt-ink-3)]" dateTime={item.occurredAt}>
                        {when(item.occurredAt)}
                      </time>
                    </div>
                    {item.detail ? (
                      <p className="mt-0.5 text-[13px] text-[var(--tt-ink-2)]">{item.detail}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-[var(--tt-ink-3)]">{item.actorName}</p>
                  </div>
                  {item.taskId ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--tt-rule-strong)]" /> : null}
                </>
              )

              return (
                <li key={item.eventId} className="border-b border-[var(--tt-rule)] last:border-b-0">
                  {item.taskId ? (
                    <Link href={`${TODOTWO_BASE}/tasks/${item.taskId}`} className="flex gap-3 py-3">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex gap-3 py-3">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </Surface>
      )}
    </div>
  )
}

