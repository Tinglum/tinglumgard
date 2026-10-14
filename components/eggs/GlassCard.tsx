import { ReactNode } from 'react'
import { cn } from '@/lib/eggs/utils'

interface GlassCardProps {
  children: ReactNode
  variant?: 'light' | 'strong' | 'dark'
  interactive?: boolean
  accentBorder?: string
  className?: string
}

export function GlassCard({
  children,
  variant = 'light',
  interactive = false,
  accentBorder,
  className,
}: GlassCardProps) {
  const baseClasses = 'farm-card bg-white border border-neutral-200 rounded'
  const hoverClasses = interactive
    ? 'cursor-pointer hover:border-neutral-400 motion-safe:hover:-translate-y-0.5'
    : ''

  return (
    <div
      className={cn(
        baseClasses,
        'transition-all duration-300',
        hoverClasses,
        accentBorder && 'border-t-2',
        className
      )}
      style={accentBorder ? { borderTopColor: accentBorder } : undefined}
    >
      {children}
    </div>
  )
}
