'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

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

  const nodeInset = steps.length > 1 ? 100 / (steps.length * 2) : 50
  const lastDoneIndex = steps.reduce((idx, step, i) => (step.done ? i : idx), -1)
  const progressPercent =
    steps.length > 1 && lastDoneIndex > 0 ? (lastDoneIndex / (steps.length - 1)) * 100 : 0

  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-white p-4 md:p-5', className)}>
      {hasExpandedDetails && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? collapseLabel : expandLabel}
          </button>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {steps.map((step, index) => {
          const stepState = getStepState(index)
          const isDone = stepState === 'done'
          const isCurrent = stepState === 'current'

          return (
            <div
              key={step.key}
              className={cn(
                'relative flex items-start gap-3 rounded-lg px-2 py-2 transition-colors',
                isDone
                  ? 'bg-emerald-50/30'
                  : isCurrent
                  ? 'bg-amber-50/70'
                  : 'bg-transparent'
              )}
            >
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-[16px] top-[36px] bottom-[-12px] z-0 border-l border-dashed',
                    isDone ? 'border-emerald-300' : 'border-neutral-300'
                  )}
                />
              )}
              <div
                className={cn(
                  'relative z-10 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                  isDone
                    ? 'border-emerald-600 bg-emerald-600 text-white'
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
                    isDone ? 'text-neutral-900' : isCurrent ? 'text-amber-900' : 'text-neutral-700'
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

      <div className="relative hidden md:block">
        {steps.length > 1 && (
          <>
            <div
              className="absolute top-[14px] h-px border-t border-dashed border-neutral-300"
              style={{ left: `${nodeInset}%`, right: `${nodeInset}%` }}
            />
            {progressPercent > 0 && (
              <div
                className="absolute top-[14px] h-px border-t border-dashed border-emerald-400"
                style={{
                  left: `${nodeInset}%`,
                  width: `calc((100% - ${nodeInset * 2}%) * ${Math.min(progressPercent, 100) / 100})`,
                }}
              />
            )}
          </>
        )}

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const stepState = getStepState(index)
          const isDone = stepState === 'done'
          const isCurrent = stepState === 'current'

          return (
            <div
              key={step.key}
              className={cn(
                'relative flex min-h-[112px] flex-col items-center px-2 py-1 text-center',
                isDone
                  ? 'text-neutral-900'
                  : isCurrent
                  ? 'text-amber-900'
                  : 'text-neutral-600'
              )}
            >
              <div className="mb-2 flex w-full justify-center">
                <div
                  className={cn(
                    'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                    isDone
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : isCurrent
                      ? 'border-amber-500 bg-amber-100 text-amber-700'
                      : 'border-neutral-300 bg-white text-neutral-400'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : index + 1}
                </div>
              </div>
              <p
                className={cn(
                  'text-sm font-medium',
                  isDone ? 'text-neutral-900' : isCurrent ? 'text-amber-900' : 'text-neutral-700'
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
    </div>
  )
}
