import { AdminStatus } from '@/lib/admin-types'
import { getStatusLabel, getStatusTone } from '@/lib/admin-utils'
import { cn } from '@/lib/utils'

export function AdminStatusBadge({ status }: { status: AdminStatus }) {
  return (
    <span className={cn('badge', getStatusTone(status))}>
      {getStatusLabel(status)}
    </span>
  )
}
