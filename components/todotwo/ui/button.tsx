import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * TodoTwo's button.
 *
 * Deliberately not components/ui/button.tsx: that one styles itself with
 * shadcn tokens (bg-primary, ring-ring) which this repository never defines,
 * so it renders unstyled. This one uses the scoped tokens from
 * app/todotwo/todotwo.css.
 *
 * Touch targets are 44px minimum on the default size — this gets used one-handed
 * in a barn, in gloves.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--tt-accent)] text-[var(--tt-on-accent)] hover:bg-[var(--tt-accent-hover)]',
        secondary:
          'border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] text-[var(--tt-ink)] hover:bg-[var(--tt-surface-2)]',
        ghost: 'text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)] hover:text-[var(--tt-ink)]',
        danger:
          'bg-[var(--tt-danger)] text-[var(--tt-on-accent)] hover:opacity-90',
        link: 'text-[var(--tt-accent)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-[44px] px-4 py-2',
        sm: 'min-h-[36px] px-3 text-[13px]',
        lg: 'min-h-[52px] px-6 text-base',
        icon: 'h-11 w-11',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      block: false,
    },
  }
)

export interface TodoTwoButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, TodoTwoButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'TodoTwoButton'

export { buttonVariants }
