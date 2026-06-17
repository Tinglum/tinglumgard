import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ArrowRight } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { canViewBnimsp, canEditBnimsp } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { BniHeader } from '@/components/bnimsp/BniHeader'

export const dynamic = 'force-dynamic'

export default async function AppendixIndexPage() {
  const session = await getSession()
  if (!canViewBnimsp(session)) redirect('/bnimsp/login')
  const { content } = await loadContent('published')

  return (
    <>
      <BniHeader active="appendix" name={session?.name} canEdit={canEditBnimsp(session)} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-2xl font-extrabold">Vedlegg</h1>
        <p className="mb-6 text-sm text-[var(--bni-muted)]">
          Gruppeoppgaver, språkbank, coachingspørsmål, leveringsvarianter og sjekklister fra trenermanualen.
        </p>
        <ul className="space-y-2">
          {content.appendix.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/bnimsp/appendix/${a.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-[var(--bni-line)] bg-white px-4 py-3 transition-colors hover:border-[var(--bni-red)]/40 hover:bg-zinc-50"
              >
                <BookOpen className="h-5 w-5 shrink-0 text-[var(--bni-red)]" />
                <span className="min-w-0 flex-1 font-medium group-hover:text-[var(--bni-red)]">{a.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-[var(--bni-red)]" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
