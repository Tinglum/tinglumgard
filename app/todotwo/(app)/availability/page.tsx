import { RequestTimeOffForm } from '@/components/todotwo/availability/request-time-off-form'
import { MyTimeOffList } from '@/components/todotwo/availability/my-time-off-list'
import { PendingApprovalsList } from '@/components/todotwo/availability/pending-approvals-list'
import { PendingHandoffList } from '@/components/todotwo/onboarding/pending-handoff-list'
import { Surface } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import {
  getPendingHandoffRequestsFor,
  getPendingTimeOffRequests,
  getTimeOffRequestsForPerson,
} from '@/lib/todotwo/queries'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator']

export default async function AvailabilityPage() {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/availability`)
  const isStaff = principal.roles.some((role) => STAFF_ROLES.includes(role))

  const [myRequests, pending, handoffs] = await Promise.all([
    getTimeOffRequestsForPerson(principal.person.id),
    isStaff ? getPendingTimeOffRequests() : Promise.resolve([]),
    getPendingHandoffRequestsFor(principal.person.id),
  ])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Availability</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Request time off and see where each request stands.
        </p>
      </header>

      <RequestTimeOffForm />

      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Your requests
        </h2>
        <MyTimeOffList requests={myRequests} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Task handoff requests
        </h2>
        <PendingHandoffList requests={handoffs} />
      </div>

      {isStaff ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            Pending approvals
          </h2>
          <PendingApprovalsList requests={pending} />
        </div>
      ) : null}

      <Surface className="p-4 text-[13px] text-[var(--tt-ink-3)]">
        Approved time off is treated as unavailable when the schedule is generated. A pending
        request has no effect on assignment until staff approve it.
      </Surface>
    </div>
  )
}
