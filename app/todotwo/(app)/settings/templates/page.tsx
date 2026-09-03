import type { Metadata } from 'next'

import { TemplateManager } from '@/components/todotwo/templates/template-manager'
import { requireRole } from '@/lib/todotwo/auth'
import { getTaskTemplates } from '@/lib/todotwo/queries'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const metadata: Metadata = { title: 'Task templates' }
export const dynamic = 'force-dynamic'

export default async function TodoTwoTaskTemplatesPage() {
  await requireRole(
    ['super_admin', 'farm_admin', 'coordinator'],
    `${TODOTWO_BASE}/settings/templates`
  )

  const templates = await getTaskTemplates()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Task templates</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Reusable checklists — "New animal arrival", "Deep-clean the coop" — that anyone can drop
          onto a day from Routines. Farm-wide, so the name has to be unique.
        </p>
      </header>

      <TemplateManager templates={templates} />
    </div>
  )
}
