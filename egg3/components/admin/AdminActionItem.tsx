'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface AdminActionItemProps {
  title: string
  description: string
  primaryLabel: string
  danger?: boolean
  requireReason?: boolean
  requireConfirm?: boolean
}

export function AdminActionItem({
  title,
  description,
  primaryLabel,
  danger = false,
  requireReason = false,
  requireConfirm = false,
}: AdminActionItemProps) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const canSubmit = useMemo(() => {
    if (requireReason && reason.trim().length === 0) return false
    if (requireConfirm && !confirmed) return false
    return true
  }, [requireReason, requireConfirm, reason, confirmed])

  return (
    <div
      className={cn(
        'rounded-sm border border-neutral-200 bg-white p-4',
        danger && 'border-red-200'
      )}
    >
      <div className="text-sm font-semibold text-neutral-900">{title}</div>
      <p className="mt-1 text-xs text-neutral-600">{description}</p>

      {requireReason && (
        <div className="mt-3">
          <label className="text-xs uppercase tracking-wider text-neutral-500">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="input mt-2"
            placeholder="Required"
          />
        </div>
      )}

      {requireConfirm && (
        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Confirm action and log entry
        </label>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        className={cn(
          'mt-4 w-full rounded border px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors duration-150',
          danger
            ? 'border-red-300 text-red-700 hover:bg-red-100 disabled:opacity-40'
            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40'
        )}
      >
        {primaryLabel}
      </button>
    </div>
  )
}
