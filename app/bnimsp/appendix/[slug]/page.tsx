import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { canViewBnimsp, canEditBnimsp } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { BniHeader } from '@/components/bnimsp/BniHeader'
import { AppendixBody } from '@/components/bnimsp/AppendixBody'

export const dynamic = 'force-dynamic'

export default async function AppendixDetailPage({ params }: { params: { slug: string } }) {
  const session = await getSession()
  if (!canViewBnimsp(session)) redirect('/bnimsp/login')
  const canEdit = canEditBnimsp(session)

  const { content } = await loadContent(canEdit ? 'draft' : 'published')
  const page = content.appendix.find((a) => a.slug === params.slug)
  if (!page) notFound()

  return (
    <>
      <BniHeader active="appendix" name={session?.name} canEdit={canEdit} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/bnimsp/appendix"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--bni-muted)] hover:text-[var(--bni-red)]"
        >
          <ArrowLeft className="h-4 w-4" /> Alle vedlegg
        </Link>
        <h1 className="mb-4 text-2xl font-extrabold">{page.title}</h1>
        <AppendixBody slug={page.slug} initialBody={page.body} canEdit={canEdit} />
      </main>
    </>
  )
}
