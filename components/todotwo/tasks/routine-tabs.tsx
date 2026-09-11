'use client'

import * as React from 'react'

/**
 * The routines, split by what kind of work they are.
 *
 * Twenty-seven routines in one column meant scrolling past the goats to reach
 * the bread. They already sort themselves honestly — every routine belongs to
 * a project, and those projects are exactly animals, housekeeping and the farm
 * week — so the tabs are the grouping that is already in the data rather than
 * a new one invented for the screen.
 *
 * Content for every tab is rendered by the server and handed in as children;
 * this only chooses which to show. That keeps the routine cards (and the
 * editors inside them) server-rendered, and means switching tabs costs
 * nothing.
 */

export interface RoutineTab {
  key: string
  label: string
  count: number
  content: React.ReactNode
}

export function RoutineTabs({ tabs }: { tabs: RoutineTab[] }) {
  const [active, setActive] = React.useState(tabs[0]?.key ?? '')

  if (tabs.length === 0) return null

  const current = tabs.find((tab) => tab.key === active) ?? tabs[0]

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Kinds of routine"
        className="flex flex-wrap gap-2 border-b border-[var(--tt-rule)] pb-2"
      >
        {tabs.map((tab) => {
          const on = tab.key === current.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(tab.key)}
              className={`min-h-9 rounded-md px-3 text-[14px] ${
                on
                  ? 'bg-[var(--tt-accent)] font-medium text-white'
                  : 'text-[var(--tt-ink-2)] hover:bg-[var(--tt-rule)]'
              }`}
            >
              {tab.label}
              <span className={on ? 'opacity-80' : 'text-[var(--tt-ink-3)]'}> · {tab.count}</span>
            </button>
          )
        })}
      </div>

      {/* Every tab stays mounted and only the inactive ones are hidden, so a
          half-finished edit is still there when you come back to it. */}
      {tabs.map((tab) => (
        <div key={tab.key} role="tabpanel" hidden={tab.key !== current.key}>
          <div className="flex flex-col gap-4">{tab.content}</div>
        </div>
      ))}
    </div>
  )
}
