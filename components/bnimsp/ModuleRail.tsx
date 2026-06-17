'use client'

import type { ModuleGroup } from '@/lib/bnimsp/util'
import { formatMinutes } from '@/lib/bnimsp/util'

interface Props {
  groups: ModuleGroup[]
  currentN: number
  onSelect: (n: number) => void
}

export function ModuleRail({ groups, currentN, onSelect }: Props) {
  return (
    <nav className="space-y-4">
      {groups.map((g, gi) => (
        <div key={g.module.id}>
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--bni-muted)]">
              {gi + 1}. {g.module.title}
            </span>
            <span className="text-[10px] text-zinc-400">{formatMinutes(g.minutes)}</span>
          </div>
          <ul>
            {g.slides.map((s) => {
              const active = s.n === currentN
              return (
                <li key={s.n}>
                  <button
                    onClick={() => onSelect(s.n)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? 'bg-[var(--bni-red)] font-semibold text-white'
                        : 'text-[var(--bni-ink)] hover:bg-zinc-100'
                    }`}
                  >
                    <span
                      className={`w-6 shrink-0 text-xs font-semibold ${
                        active ? 'text-white/80' : 'text-zinc-400'
                      }`}
                    >
                      {String(s.n).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.title || `Slide ${s.n}`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
