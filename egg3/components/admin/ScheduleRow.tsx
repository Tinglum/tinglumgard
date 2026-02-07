'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AdminScheduleEntry, AdminStatus } from '@/lib/admin-types'
import { formatLongDate } from '@/lib/admin-utils'
import { AdminStatusBadge } from './AdminStatusBadge'
import { cn } from '@/lib/utils'

interface ScheduleRowProps {
  windowLabel: string
  windowDate: Date
  entry: AdminScheduleEntry
  productLabel?: string
}

export function ScheduleRow({
  windowLabel,
  windowDate,
  entry,
  productLabel,
}: ScheduleRowProps) {
  const [open, setOpen] = useState(false)
  const [capacity, setCapacity] = useState(entry.capacity)
  const initialStatus: AdminStatus =
    entry.status === 'sold_out' ? 'closed' : entry.status
  const [status, setStatus] = useState<AdminStatus>(initialStatus)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const isLocked = entry.status === 'locked'
  const capacityTooLow = capacity < entry.allocated
  const isReopeningLocked = isLocked && status !== 'locked'
  const canSave =
    !capacityTooLow && !isReopeningLocked && reason.trim().length > 0 && confirmed

  const remaining = Math.max(0, capacity - entry.allocated)

  const actionLabel = entry.status === 'closed' ? 'Open' : 'Edit'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left focus-ring"
        aria-label={`Edit ${productLabel ?? entry.productName} for ${windowLabel}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-neutral-50"
          style={{
            borderLeftWidth: entry.accentColor ? 4 : 2,
            borderLeftStyle: 'solid',
            borderLeftColor: entry.accentColor ?? '#E5E7EB',
          }}
        >
          <div className="font-medium text-neutral-900">
            {productLabel ?? entry.productName}
          </div>
          <div className="text-sm font-mono tabular-nums text-neutral-700">
            {entry.allocated} / {entry.capacity}
          </div>
          <AdminStatusBadge status={entry.status} />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            [{actionLabel}]
          </span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div
            className="w-full max-w-2xl rounded-sm border border-neutral-200 bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <div className="text-sm uppercase tracking-wider text-neutral-500">
                  {windowLabel}
                </div>
                <div className="text-lg font-semibold text-neutral-900">
                  {entry.productName}
                </div>
                <div className="text-sm text-neutral-600">
                  {formatLongDate(windowDate)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
              >
                Close
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Capacity
                </div>
                <input
                  type="number"
                  min={entry.allocated}
                  value={capacity}
                  onChange={(event) => setCapacity(Number(event.target.value))}
                  className="input max-w-[180px]"
                />
                {capacityTooLow && (
                  <p className="text-xs text-red-600">
                    Capacity cannot be below allocated quantity.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    Allocated
                  </div>
                  <div className="text-lg font-mono tabular-nums text-neutral-900">
                    {entry.allocated} {entry.unitLabel}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    Remaining
                  </div>
                  <div className="text-lg font-mono tabular-nums text-neutral-900">
                    {remaining} {entry.unitLabel}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    Status
                  </div>
                  <div className="mt-2 space-y-2 text-sm text-neutral-700">
                    {(['open', 'closed', 'locked'] as AdminStatus[]).map(
                      (option) => (
                        <label
                          key={option}
                          className={cn(
                            'flex items-center gap-2',
                            isLocked && option !== 'locked'
                              ? 'text-neutral-400'
                              : 'text-neutral-700'
                          )}
                        >
                          <input
                            type="radio"
                            name={`status-${entry.id}`}
                            value={option}
                            checked={status === option}
                            onChange={() => setStatus(option)}
                            disabled={isLocked && option !== 'locked'}
                          />
                          <span className="capitalize">{option}</span>
                        </label>
                      )
                    )}
                  </div>
                  {entry.status === 'sold_out' && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Sold out windows require capacity changes to reopen.
                    </p>
                  )}
                  {isReopeningLocked && (
                    <p className="mt-2 text-xs text-red-600">
                      Locked windows cannot be reopened.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Notes (internal)
                </div>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Optional internal notes"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-neutral-500">
                  Confirmation
                </div>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Reason for change"
                />
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  Confirm change and log action
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4">
              <Link
                href="/admin/orders"
                className="rounded-sm px-2 py-1 text-sm font-semibold text-neutral-700 hover:text-neutral-900 focus-ring"
              >
                View orders for this week
              </Link>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSave}
                  className="btn-primary"
                  onClick={() => setOpen(false)}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
