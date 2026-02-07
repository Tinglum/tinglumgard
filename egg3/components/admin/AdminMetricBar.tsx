import { getCapacityPercent } from '@/lib/admin-utils'

export function AdminMetricBar({
  allocated,
  capacity,
}: {
  allocated: number
  capacity: number
}) {
  const percent = getCapacityPercent(allocated, capacity)

  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="h-2 flex-1 rounded bg-neutral-200">
        <div
          className="h-2 rounded bg-neutral-900"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs font-mono tabular-nums text-neutral-600">
        {allocated} / {capacity}
      </div>
    </div>
  )
}
