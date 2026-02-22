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
  const currentStepIndex = steps.findIndex((step) => !step.done)

  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-neutral-50 p-4', className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
        {steps.map((step, index) => {
          const isDone = step.done
          const isCurrent = index === currentStepIndex
          const connectorClass = isDone ? 'border-emerald-300' : 'border-neutral-300'

          return (
            <div
              key={step.key}
              className={cn(
                'relative flex items-start gap-3 rounded-lg px-2 py-2 transition-colors',
                isCurrent && 'bg-amber-50 ring-1 ring-amber-200'
              )}
            >
              {index < steps.length - 1 && (
                <>
                  <div className={cn('absolute left-5 top-9 bottom-[-10px] border-l border-dashed md:hidden', connectorClass)} />
                  <div className={cn('absolute left-12 right-[-8px] top-5 hidden border-t border-dashed md:block', connectorClass)} />
                </>
              )}
              <div
                className={cn(
                  'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                  isDone
                    ? 'border-emerald-500 bg-white text-emerald-600'
                    : isCurrent
                    ? 'border-amber-500 bg-amber-100 text-amber-700'
                    : 'border-neutral-300 bg-white text-neutral-400'
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isDone ? 'text-neutral-900' : isCurrent ? 'text-amber-900' : 'text-neutral-500'
                  )}
                >
                  {step.label}
                </p>
                {step.hint && (
                  <p className={cn('text-xs', isCurrent ? 'text-amber-800' : 'text-neutral-500')}>
                    {step.hint}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
