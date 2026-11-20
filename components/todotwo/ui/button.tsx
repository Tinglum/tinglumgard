import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * TodoTwo's button.
 *
 * Touch targets are 44px minimum on the default size — used one-handed on
 * mobile in the barn, with crisp elevation and immediate tactile press.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--tt-accent)] text-[var(--tt-on-accent)] shadow-[var(--tt-shadow-xs)] hover:bg-[var(--tt-accent-hover)]',
        soft:
          'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)] hover:bg-[var(--tt-accent)] hover:text-[var(--tt-on-accent)]',
        secondary:
          'border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] text-[var(--tt-ink)] shadow-[var(--tt-shadow-xs)] hover:bg-[var(--tt-surface-2)]',
        ghost: 'text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)] hover:text-[var(--tt-ink)]',
        danger:
          'bg-[var(--tt-danger)] text-[var(--tt-on-accent)] shadow-[var(--tt-shadow-xs)] hover:opacity-90',
        link: 'text-[var(--tt-accent)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-[42px] px-4 py-2',
        sm: 'min-h-[34px] px-3 text-[13px]',
        lg: 'min-h-[50px] px-6 text-[15px]',
        icon: 'h-10 w-10',
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
