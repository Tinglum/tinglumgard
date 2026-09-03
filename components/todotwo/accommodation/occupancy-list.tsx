import { BedDouble } from 'lucide-react'

import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import type { AccommodationRow, OccupancyRow } from '@/lib/todotwo/queries'

export function OccupancyList({
  accommodations,
  occupancy,
}: {
  accommodations: AccommodationRow[]
  occupancy: OccupancyRow[]
}) {
  if (accommodations.length === 0) {
    return (
      <EmptyState
        icon={BedDouble}
        title="No accommodation set up yet"
        description="Rooms, cabins and dorm beds go here once they exist in the database."
      />
    )
  }

  const byAccommodation = new Map<string, OccupancyRow[]>()
  for (const row of occupancy) {
    const list = byAccommodation.get(row.accommodation_id)
    if (list) list.push(row)
    else byAccommodation.set(row.accommodation_id, [row])
  }

  return (
    <div className="flex flex-col gap-3">
      {accommodations.map((accommodation) => {
        const rows = byAccommodation.get(accommodation.id) ?? []
        return (
          <Surface key={accommodation.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px]">{accommodation.name}</p>
              <span className="shrink-0 rounded bg-[var(--tt-surface-2)] px-2 py-0.5 text-[11px] text-[var(--tt-ink-3)]">
                {accommodation.kind.replace('_', ' ')}
              </span>
            </div>

            {rows.length === 0 ? (
              <p className="mt-1 text-[13px] text-[var(--tt-ink-3)]">Free</p>
            ) : (
              <ul className="mt-1 list-none">
                {rows.map((row) => (
                  <li key={row.assignment_id} className="py-1 text-[13px] text-[var(--tt-ink-2)]">
                    {row.preferred_name || row.full_name} · {row.start_date} –{' '}
                    {row.end_date ?? 'open-ended'}
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        )
      })}
    </div>
  )
}
