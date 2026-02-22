'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

type TimelineStep = {
  key: string
  label: string
  summary?: string
  detail?: string
  done: boolean
}

type StepTimelineProps = {
  steps: TimelineStep[]
  expandLabel: string
  collapseLabel: string
  className?: string
}

export function StepTimeline({ steps, expandLabel, collapseLabel, className }: StepTimelineProps) {
  const [expanded, setExpanded] = useState(false)
  const firstOpenStepIndex = steps.findIndex((step) => !step.done)
  const activeStepIndex = firstOpenStepIndex === -1 ? -1 : firstOpenStepIndex
  const hasExpandedDetails = steps.some(
    (step) => Boolean(step.detail) && step.detail !== step.summary
  )

  const getStepState = (index: number) => {
    if (steps[index]?.done) return 'done' as const
    if (index === activeStepIndex) return 'current' as const
    return 'upcoming' as const
  }

  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-neutral-50 p-4', className)}>
      {hasExpandedDetails && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            {expanded ? collapseLabel : expandLabel}
          </button>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {steps.map((step, index) => {
          const stepState = getStepState(index)
          const isDone = stepState === 'done'
          const isCurrent = stepState === 'current'
          const connectorClass = isDone
            ? 'border-emerald-300'
            : isCurrent
            ? 'border-amber-300'
            : 'border-neutral-300'

          return (
            <div
              key={step.key}
              className={cn(
                'relative flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors',
                isDone
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : isCurrent
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-neutral-200 bg-white'
              )}
            >
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-[16px] top-[36px] bottom-[-12px] z-0 border-l border-dashed',
                    connectorClass
                  )}
                />
              )}
              <div
                className={cn(
                  'relative z-10 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                  isDone
                    ? 'border-emerald-500 bg-white text-emerald-600'
                    : isCurrent
                    ? 'border-amber-500 bg-amber-100 text-amber-700'
                    : 'border-neutral-300 bg-white text-neutral-400'
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="relative z-10 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isDone ? 'text-neutral-900' : isCurrent ? 'text-amber-900' : 'text-neutral-500'
                  )}
                >
                  {step.label}
                </p>
                {step.summary && (
                  <p className={cn('text-xs', isCurrent ? 'text-amber-800' : 'text-neutral-500')}>
                    {step.summary}
                  </p>
                )}
                {expanded && step.detail && step.detail !== step.summary && (
                  <p className="mt-0.5 text-xs text-neutral-600">{step.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden grid-cols-4 gap-4 md:grid">
        {steps.map((step, index) => {
          const stepState = getStepState(index)
          const isDone = stepState === 'done'
          const isCurrent = stepState === 'current'
          const connectorClass = isDone
            ? 'border-emerald-300'
            : isCurrent
            ? 'border-amber-300'
            : 'border-neutral-300'

          return (
            <div
              key={step.key}
              className={cn(
                'relative flex min-h-[120px] flex-col items-center rounded-lg border px-3 py-3 text-center transition-colors',
                isDone
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : isCurrent
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-neutral-200 bg-white'
              )}
            >
              <div className="mb-2 flex w-full items-center">
                <div
                  className={cn(
                    'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                    isDone
                      ? 'border-emerald-500 bg-white text-emerald-600'
                      : isCurrent
                      ? 'border-amber-500 bg-amber-100 text-amber-700'
                      : 'border-neutral-300 bg-white text-neutral-400'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'ml-2 h-px flex-1 border-t border-dashed',
                      connectorClass
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  'text-sm font-medium',
                  isDone ? 'text-neutral-900' : isCurrent ? 'text-amber-900' : 'text-neutral-500'
                )}
              >
                {step.label}
              </p>
              {step.summary && (
                <p className={cn('mt-0.5 text-xs', isCurrent ? 'text-amber-800' : 'text-neutral-500')}>
                  {step.summary}
                </p>
              )}
              {expanded && step.detail && step.detail !== step.summary && (
                <p className="mt-1 text-xs text-neutral-600">{step.detail}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
