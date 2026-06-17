'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, BookOpen, Presentation, ListChecks } from 'lucide-react'
import { BniMark } from './BniMark'

interface Props {
  active?: 'overview' | 'studio' | 'appendix'
  name?: string
  canEdit?: boolean
}

const NAV = [
  { key: 'overview', href: '/bnimsp', label: 'Oversikt', icon: ListChecks },
  { key: 'studio', href: '/bnimsp/studio', label: 'Studio', icon: Presentation },
  { key: 'appendix', href: '/bnimsp/appendix', label: 'Vedlegg', icon: BookOpen },
] as const

export function BniHeader({ active, name, canEdit }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    await fetch('/api/bnimsp/auth/logout', { method: 'POST' })
    router.replace('/bnimsp/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--bni-line)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/bnimsp" className="shrink-0 text-lg">
          <BniMark />
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ key, href, label, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active === key
                  ? 'bg-[var(--bni-red)] text-white'
                  : 'text-[var(--bni-muted)] hover:bg-zinc-100 hover:text-[var(--bni-ink)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {canEdit && (
            <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 sm:inline">
              Redaktør
            </span>
          )}
          {name && <span className="hidden text-sm text-[var(--bni-muted)] md:inline">{name}</span>}
          <button
            onClick={logout}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--bni-line)] px-2.5 py-1.5 text-sm font-medium text-[var(--bni-ink)] transition-colors hover:bg-zinc-100 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logg ut</span>
          </button>
        </div>
      </div>
    </header>
  )
}
