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
  const variantClasses = {
    light: 'glass-light shadow',
    strong: 'glass-strong shadow-lg',
    dark: 'glass-dark',
  }

  return (
    <div
      className={cn(
        'rounded transition-all duration-200',
        variantClasses[variant],
        interactive && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        accentBorder && 'border-l-2',
        className
      )}
      style={accentBorder ? { borderLeftColor: accentBorder } : undefined}
    >
      {children}
    </div>
  )
}
