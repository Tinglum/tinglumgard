import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { navItemsForRoles } from '@/components/todotwo/shell/navigation'
import { Surface } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function MorePage() {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/more`)
  const items = navItemsForRoles(principal.roles).filter(
    (item) => !item.primary && item.href !== `${TODOTWO_BASE}/more`
  )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">More</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">Farm lists, people, routines, and settings.</p>
      </header>

      <Surface className="px-4">
        <ul className="list-none">
          {items.map((item) => (
            <li key={item.href} className="border-b border-[var(--tt-rule)] last:border-b-0">
              <Link href={item.href} className="flex min-h-14 items-center gap-3 py-3">
                <item.icon className="h-5 w-5 shrink-0 text-[var(--tt-accent)]" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tt-ink-3)]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  )
}
