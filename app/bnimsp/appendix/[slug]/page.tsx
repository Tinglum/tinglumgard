import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp, canEditBnimsp } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { APPENDIX_CATEGORIES, metaFor } from '@/lib/bnimsp/appendix-meta'
import { extractHeadings, readMinutes } from '@/lib/bnimsp/markdown'
import { BniHeader } from '@/components/bnimsp/BniHeader'
import { AppendixBody } from '@/components/bnimsp/AppendixBody'
import { AppendixIcon } from '@/components/bnimsp/AppendixIcon'
import { AppendixToc } from '@/components/bnimsp/AppendixToc'

export const dynamic = 'force-dynamic'

export default async function AppendixDetailPage({ params }: { params: { slug: string } }) {
  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) redirect('/bnimsp/login')
  const canEdit = canEditBnimsp(session)

  const { content } = await loadContent(canEdit ? 'draft' : 'published')
  const page = content.appendix.find((a) => a.slug === params.slug)
  if (!page) notFound()

  const meta = metaFor(params.slug)
  const category = meta ? APPENDIX_CATEGORIES.find((c) => c.id === meta.category) : undefined
  const headings = extractHeadings(page.body)

  return (
    <>
      <BniHeader active="appendix" name={session?.name} canEdit={canEdit} />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <Link
          href="/bnimsp/appendix"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--bni-muted)] transition-colors hover:text-[var(--bni-red)]"
        >
          <ArrowLeft className="h-4 w-4" /> Trenerverktøy
        </Link>

        {/* Header */}
        <header className="mb-8 flex items-start gap-4 border-b border-[var(--bni-line)] pb-6">
          {meta && (
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--bni-red)]/8 text-[var(--bni-red)] ring-1 ring-inset ring-[var(--bni-red)]/15 sm:flex">
              <AppendixIcon name={meta.icon} className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            {category && (
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--bni-red)]">{category.title}</span>
            )}
            <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight">{page.title}</h1>
            {meta && <p className="mt-2 max-w-2xl text-[var(--bni-muted)]">{meta.summary}</p>}
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Clock className="h-3.5 w-3.5" /> {readMinutes(page.body)} min
            </div>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
          <article className="min-w-0">
            <AppendixBody slug={page.slug} initialBody={page.body} canEdit={canEdit} />
          </article>

          {headings.length > 2 && (
            <aside className="hidden lg:block">
              <AppendixToc headings={headings} />
            </aside>
          )}
        </div>
      </main>
    </>
  )
}
