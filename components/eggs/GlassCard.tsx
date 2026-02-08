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
  // All variants now use Nordic minimal design
  const baseClasses = 'bg-white border border-neutral-200 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]'
  const hoverClasses = interactive
    ? 'cursor-pointer hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-1'
    : 'hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]'

  return (
    <div
      className={cn(
        baseClasses,
        'transition-all duration-300',
        hoverClasses,
        accentBorder && 'border-l-4',
        className
      )}
      style={accentBorder ? { borderLeftColor: accentBorder } : undefined}
    >
      {children}
    </div>
  )
}
