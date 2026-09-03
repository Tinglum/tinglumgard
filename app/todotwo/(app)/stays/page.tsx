import { AddStayForm } from '@/components/todotwo/stays/add-stay-form'
import { StaysList } from '@/components/todotwo/stays/stays-list'
import { requireRole } from '@/lib/todotwo/auth'
import { getPeople, getStays } from '@/lib/todotwo/queries'

export const dynamic = 'force-dynamic'

export default async function StaysPage() {
  await requireRole(['super_admin', 'farm_admin', 'coordinator'], '/todotwo/stays')

  const [{ current, upcoming }, people] = await Promise.all([getStays(), getPeople()])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Stays</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Who is here now and who is arriving next. Add a person on the People page first, then
          record their stay here.
        </p>
      </header>

      <AddStayForm
        people={people.map((p) => ({ id: p.id, label: p.preferred_name || p.full_name }))}
      />

      <StaysList
        title="Here now"
        stays={current}
        emptyDescription="No one is currently on a recorded stay."
      />

      <StaysList
        title="Arriving soon"
        stays={upcoming}
        emptyDescription="No arrivals in the next 30 days."
      />
    </div>
  )
}
