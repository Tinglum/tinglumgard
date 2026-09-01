'use client'

import * as React from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/todotwo/ui/button'

/**
 * Confirmation for destructive actions. Standing requirement across TodoTwo:
 * nothing irreversible happens on a single tap.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Bekreft',
  cancelLabel = 'Avbryt',
  destructive = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}) {
  const [pending, setPending] = React.useState(false)

  async function handleConfirm() {
    try {
      setPending(true)
      await onConfirm()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content
          className={cn(
            'todotwo-root fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-5 shadow-lg'
          )}
        >
          <AlertDialog.Title className="text-base font-semibold text-[var(--tt-ink)]">
            {title}
          </AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className="mt-2 text-sm text-[var(--tt-ink-2)]">
              {description}
            </AlertDialog.Description>
          ) : null}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
              disabled={pending}
            >
              {cancelLabel}
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className={cn(
                buttonVariants({ variant: destructive ? 'danger' : 'primary', size: 'sm' })
              )}
            >
              {pending ? 'Vent …' : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
