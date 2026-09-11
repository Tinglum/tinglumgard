'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'

/**
 * The steps half of both editors.
 *
 * A routine's steps live in task_series_steps and a one-off task's are child
 * tasks, so the two editors cannot share a save path — but on screen they are
 * the same thing, and a person editing one should not find the other behaves
 * differently. Shared here so they cannot drift; the differences stay where
 * they actually are, in the two route handlers.
 */

export interface DraftStep {
  /** Absent until the step has been saved once. */
  id?: string
  title: string
  description: string
  /** Local only, so a row keeps its identity while it is being typed into. */
  key: string
}

let nextKey = 0
export function freshStep(): DraftStep {
  nextKey += 1
  return { title: '', description: '', key: `new-${nextKey}` }
}

export const FIELD_CLASS =
  'w-full rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 py-2 text-[14px]'

export function StepsFields({
  steps,
  onChange,
  note,
}: {
  steps: DraftStep[]
  onChange: (next: DraftStep[]) => void
  note: string
}) {
  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function update(index: number, patch: Partial<DraftStep>) {
    onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px]">Steps</p>

      {steps.length === 0 ? (
        <p className="text-[12px] text-[var(--tt-ink-3)]">No steps. Add one below.</p>
      ) : null}

      {steps.map((step, index) => (
        <div
          key={step.key}
          className="flex flex-col gap-1.5 rounded-md border border-[var(--tt-rule)] p-3"
        >
          <div className="flex items-start gap-2">
            <input
              className={FIELD_CLASS}
              value={step.title}
              placeholder="What to do"
              onChange={(e) => update(index, { title: e.target.value })}
            />
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                aria-label="Move step up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="p-1 disabled:opacity-30"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                aria-label="Move step down"
                disabled={index === steps.length - 1}
                onClick={() => move(index, 1)}
                className="p-1 disabled:opacity-30"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Remove step"
              onClick={() => onChange(steps.filter((_, i) => i !== index))}
              className="shrink-0 p-1 text-[var(--tt-danger)]"
            >
              <X size={16} />
            </button>
          </div>
          <textarea
            className={`${FIELD_CLASS} min-h-[52px]`}
            value={step.description}
            placeholder="Detail, if it needs any."
            onChange={(e) => update(index, { description: e.target.value })}
          />
        </div>
      ))}

      <Button
        size="sm"
        variant="ghost"
        className="self-start"
        onClick={() => onChange([...steps, freshStep()])}
      >
        <Plus size={14} /> Add step
      </Button>

      <p className="text-[12px] text-[var(--tt-ink-3)]">{note}</p>
    </div>
  )
}
