import * as React from 'react'
import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'

/**
 * Shared elevated card and state primitives for TodoTwo views.
 */

export function Surface({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--tt-rule)] bg-[var(--tt-surface)] shadow-[var(--tt-shadow-sm)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatusPill({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'warn' | 'danger'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5',
        tone === 'neutral' && 'bg-[var(--tt-surface-2)] text-[var(--tt-ink-2)]',
        tone === 'accent' && 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]',
        tone === 'warn' && 'bg-[var(--tt-warn-soft)] text-[var(--tt-warn)]',
        tone === 'danger' && 'bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
        className
      )}
    >
      {children}
    </span>
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
        'flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-[var(--tt-rule-strong)] bg-[var(--tt-surface)]/60 px-6 py-10 text-center',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tt-surface-2)] text-[var(--tt-ink-3)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-[15px] font-semibold text-[var(--tt-ink)]">{title}</p>
      {description ? (
        <p className="max-w-[42ch] text-[13px] text-[var(--tt-ink-2)]">{description}</p>
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
        'flex flex-col items-start gap-2 rounded-2xl border border-[var(--tt-danger-rule)] bg-[var(--tt-danger-soft)] px-4 py-3.5',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[var(--tt-danger)]" aria-hidden="true" />
        <p className="text-sm font-semibold text-[var(--tt-ink)]">{title}</p>
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
      className={cn('h-4 animate-pulse rounded-md bg-[var(--tt-surface-2)]', className)}
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
