import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Clock, ArrowRight } from 'lucide-react'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp, canEditBnimsp } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { groupByModule, totalMinutes, formatMinutes } from '@/lib/bnimsp/util'
import { BniHeader } from '@/components/bnimsp/BniHeader'
import { BniMark } from '@/components/bnimsp/BniMark'
import { AdminBar } from '@/components/bnimsp/AdminBar'

export const dynamic = 'force-dynamic'

export default async function BnimspOverviewPage() {
  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) redirect('/bnimsp/login')
  const canEdit = canEditBnimsp(session)

  const { content, source } = await loadContent('published')
  const groups = groupByModule(content)
  const total = totalMinutes(content)

  return (
    <>
      <BniHeader active="overview" name={session?.name} canEdit={canEdit} />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-[var(--bni-line)] bg-[var(--bni-ink)] text-white">
          <div className="grid gap-0 md:grid-cols-[1.3fr_1fr]">
            <div className="p-8 sm:p-10">
              <BniMark variant="white" height={30} />
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--bni-red)]">
                Train the Trainer
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
                {content.program.title}
              </h1>
              <p className="mt-3 max-w-md text-zinc-300">{content.program.subtitle}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/bnimsp/studio"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--bni-red)] px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--bni-red-dark)]"
                >
                  Start øving <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="inline-flex items-center gap-1.5 text-sm text-zinc-300">
                  <Clock className="h-4 w-4" />
                  {content.program.totalSlides} slides · {formatMinutes(total)}
                </span>
              </div>
            </div>
            <div className="relative hidden min-h-[220px] md:block">
              <Image
                src="/bnimsp/slides/slide-01.png"
                alt="Tittelslide"
                fill
                className="object-cover opacity-90"
                sizes="40vw"
                priority
              />
            </div>
          </div>
        </section>

        {canEdit && <AdminBar source={source} />}

        {/* Module map */}
        <section className="space-y-5">
          {groups.map((g, gi) => (
            <div
              key={g.module.id}
              className="overflow-hidden rounded-2xl border border-[var(--bni-line)] bg-white"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[var(--bni-line)] px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bni-red)] text-sm font-bold text-white">
                    {gi + 1}
                  </span>
                  <h2 className="text-base font-bold">{g.module.title}</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--bni-muted)]">
                  <Clock className="h-3.5 w-3.5" />
                  {formatMinutes(g.minutes)} · slide {g.module.range[0]}–{g.module.range[1]}
                </span>
              </div>
              <ul className="divide-y divide-[var(--bni-line)]">
                {g.slides.map((s) => (
                  <li key={s.n}>
                    <Link
                      href={`/bnimsp/studio?s=${s.n}`}
                      className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-zinc-50"
                    >
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--bni-line)] bg-zinc-100">
                        <Image
                          src={s.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <span className="w-9 shrink-0 text-sm font-semibold text-[var(--bni-muted)]">
                        {String(s.n).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-[var(--bni-red)]">
                        {s.title || `Slide ${s.n}`}
                      </span>
                      {s.timing && (
                        <span className="hidden shrink-0 text-xs text-[var(--bni-muted)] sm:inline">
                          {s.timing}
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-[var(--bni-red)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </main>
    </>
  )
}
