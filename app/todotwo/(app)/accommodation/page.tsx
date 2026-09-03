import { AssignBedForm } from '@/components/todotwo/accommodation/assign-bed-form'
import { OccupancyList } from '@/components/todotwo/accommodation/occupancy-list'
import { requireRole } from '@/lib/todotwo/auth'
import { getAccommodations, getOccupancy, getStays } from '@/lib/todotwo/queries'

export const dynamic = 'force-dynamic'

export default async function AccommodationPage() {
  await requireRole(['super_admin', 'farm_admin', 'coordinator'], '/todotwo/accommodation')

  const [accommodations, occupancy, { current, upcoming }] = await Promise.all([
    getAccommodations(),
    getOccupancy(),
    getStays(),
  ])

  const stayOptions = [...current, ...upcoming].map((s) => ({
    id: s.id,
    person_id: s.person_id,
    full_name: s.full_name,
    preferred_name: s.preferred_name,
  }))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Accommodation</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Who is in which room, cabin or dorm bed. The database refuses to double-book a bed even
          if two people try at the same moment.
        </p>
      </header>

      <AssignBedForm accommodations={accommodations} stays={stayOptions} />

      <OccupancyList accommodations={accommodations} occupancy={occupancy} />
    </div>
  )
}
