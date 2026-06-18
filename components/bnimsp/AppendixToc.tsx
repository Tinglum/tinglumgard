'use client'

import { useEffect, useState } from 'react'
import type { Heading } from '@/lib/bnimsp/markdown'

export function AppendixToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((e): e is HTMLElement => !!e)
    if (els.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    )
    els.forEach((e) => obs.observe(e))
    return () => obs.disconnect()
  }, [headings])

  return (
    <nav className="sticky top-24">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--bni-muted)]">På denne siden</div>
      <ul className="space-y-1 border-l border-[var(--bni-line)]">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block border-l-2 py-1 text-sm transition-colors ${
                h.level === 3 ? 'pl-5' : 'pl-3'
              } ${
                active === h.id
                  ? 'border-[var(--bni-red)] font-semibold text-[var(--bni-red)]'
                  : 'border-transparent text-[var(--bni-muted)] hover:text-[var(--bni-ink)]'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
