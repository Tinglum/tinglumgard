import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, Clock, Library } from 'lucide-react'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp, canEditBnimsp } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { APPENDIX_CATEGORIES, APPENDIX_META, appendixVisibleTo } from '@/lib/bnimsp/appendix-meta'
import { readMinutes } from '@/lib/bnimsp/markdown'
import { BniHeader } from '@/components/bnimsp/BniHeader'
import { AppendixIcon } from '@/components/bnimsp/AppendixIcon'

export const dynamic = 'force-dynamic'

export default async function AppendixHubPage() {
  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) redirect('/bnimsp/login')
  const canEdit = canEditBnimsp(session)
  const { content } = await loadContent('published')

  const bySlug = new Map(content.appendix.map((a) => [a.slug, a]))
  // Hide pages the current user isn't allowed to see (e.g. facilitator-only).
  const metas = Object.values(APPENDIX_META).filter((m) => appendixVisibleTo(m, session?.email))
  const total = metas.filter((m) => bySlug.has(m.slug)).length

  return (
    <>
      <BniHeader active="appendix" name={session?.name} canEdit={canEdit} />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="mb-10 overflow-hidden rounded-3xl border border-[var(--bni-line)] bg-[var(--bni-ink)] text-white">
          <div className="relative px-8 py-10 sm:px-12 sm:py-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--bni-red)] opacity-20 blur-3xl"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                <Library className="h-3.5 w-3.5" /> Trenerverktøy
              </span>
              <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
                Alt du trenger for å levere MSP til standard
              </h1>
              <p className="mt-3 max-w-xl text-zinc-300">
                Kjøreplaner, fasiliteringsgrep, språkbank, øvelser og sjekklister — samlet som ett oppslagsverk.
                Bygget for å hentes opp midt i leveransen.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-zinc-400">
                <span>{total} oppslag</span>
                <span className="h-1 w-1 rounded-full bg-zinc-600" />
                <span>{APPENDIX_CATEGORIES.length} kategorier</span>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <div className="space-y-12">
          {APPENDIX_CATEGORIES.map((cat) => {
            const items = metas
              .filter((m) => m.category === cat.id && bySlug.has(m.slug))
              .sort((a, b) => a.order - b.order)
            if (items.length === 0) return null
            return (
              <section key={cat.id}>
                <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--bni-line)] pb-3">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">{cat.title}</h2>
                    <p className="text-sm text-[var(--bni-muted)]">{cat.blurb}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-zinc-400">{items.length}</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((m) => {
                    const page = bySlug.get(m.slug)!
                    return (
                      <Link
                        key={m.slug}
                        href={`/bnimsp/appendix/${m.slug}`}
                        className="group relative flex flex-col rounded-2xl border border-[var(--bni-line)] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--bni-red)]/40 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.2)]"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bni-red)]/8 text-[var(--bni-red)] ring-1 ring-inset ring-[var(--bni-red)]/15">
                            <AppendixIcon name={m.icon} className="h-5 w-5" />
                          </span>
                          <ArrowUpRight className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-[var(--bni-red)]" />
                        </div>
                        <h3 className="text-base font-bold leading-snug tracking-tight group-hover:text-[var(--bni-red)]">
                          {page.title}
                        </h3>
                        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--bni-muted)]">{m.summary}</p>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <Clock className="h-3.5 w-3.5" />
                          {readMinutes(page.body)} min å lese
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </>
  )
}
