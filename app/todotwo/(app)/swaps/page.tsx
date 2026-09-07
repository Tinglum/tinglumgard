import { PendingHandoffList } from '@/components/todotwo/onboarding/pending-handoff-list'
import { PendingOffersList } from '@/components/todotwo/tasks/pending-offers-list'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getPendingHandoffRequestsFor, getPendingOffersMadeBy } from '@/lib/todotwo/queries'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function TaskSwapsPage() {
  const principal = await requireTodoTwoUser(todoTwoRoutes.swaps())
  const [received, sent] = await Promise.all([
    getPendingHandoffRequestsFor(principal.person.id),
    getPendingOffersMadeBy(principal.person.id),
  ])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Task swaps</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Accept or decline tasks offered to you, and follow offers you have sent.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Waiting for your answer
        </h2>
        <PendingHandoffList requests={received} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Offers you sent
        </h2>
        <PendingOffersList requests={sent} />
      </section>
    </div>
  )
}
