import * as React from 'react'
import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'

/**
 * The three states every TodoTwo view needs. Built once here so Phase 1 does
 * not reinvent them per screen.
 */

export function Surface({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--tt-rule-strong)] px-6 py-12 text-center',
        className
      )}
    >
      <Icon className="h-6 w-6 text-[var(--tt-ink-3)]" aria-hidden="true" />
      <p className="text-[15px] font-medium text-[var(--tt-ink)]">{title}</p>
      {description ? (
        <p className="max-w-[42ch] text-sm text-[var(--tt-ink-2)]">{description}</p>
      ) : null}
      {action ? (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-2 rounded-lg border border-[var(--tt-danger)] bg-[var(--tt-danger-soft)] px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[var(--tt-danger)]" aria-hidden="true" />
        <p className="text-sm font-medium text-[var(--tt-ink)]">{title}</p>
      </div>
      {description ? (
        <p className="text-sm text-[var(--tt-ink-2)]">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-4 animate-pulse rounded bg-[var(--tt-surface-2)]', className)}
      aria-hidden="true"
    />
  )
}

export function LoadingState({ rows = 3, label = 'Loading …' }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/3" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
