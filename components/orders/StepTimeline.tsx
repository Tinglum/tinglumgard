'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

type TimelineStep = {
  key: string
  label: string
  hint?: string
  done: boolean
}

type StepTimelineProps = {
  steps: TimelineStep[]
  className?: string
}

export function StepTimeline({ steps, className }: StepTimelineProps) {
  const currentStepIndex = Math.max(0, steps.findIndex((step) => !step.done))

  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-neutral-50 p-4', className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {steps.map((step, index) => {
          const isDone = step.done
          const isCurrent = index === currentStepIndex && !isDone

          return (
            <div key={step.key} className="relative flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                  isDone
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : isCurrent
                    ? 'border-neutral-700 bg-white text-neutral-900'
                    : 'border-neutral-300 bg-white text-neutral-400'
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isDone ? 'text-neutral-900' : isCurrent ? 'text-neutral-800' : 'text-neutral-500'
                  )}
                >
                  {step.label}
                </p>
                {step.hint && <p className="text-xs text-neutral-500">{step.hint}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

