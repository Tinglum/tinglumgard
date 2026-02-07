'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AdminMode } from '@/lib/admin-types'
import { ADMIN_MODE_OPTIONS } from '@/lib/admin-utils'
import { setAdminMode } from '@/app/admin/actions'

export function AdminModeToggle({ mode }: { mode: AdminMode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as AdminMode
    startTransition(async () => {
      await setAdminMode(next)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-500">
      <span>Mode</span>
      <select
        aria-label="Admin mode"
        value={mode}
        onChange={handleChange}
        disabled={isPending}
        className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus-ring"
      >
        {ADMIN_MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
