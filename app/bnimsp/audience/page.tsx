import { redirect } from 'next/navigation'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp, canEditBnimsp, getBnimspRole } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { Studio } from '@/components/bnimsp/Studio'

export const dynamic = 'force-dynamic'

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: { s?: string }
}) {
  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) redirect('/bnimsp/login')

  const canEdit = canEditBnimsp(session)
  const { content } = await loadContent(canEdit ? 'draft' : 'published')
  const initialN = Number(searchParams.s) || 1

  return (
    <Studio
      initialContent={content}
      canEdit={canEdit}
      isDirector={getBnimspRole(session) === 'director'}
      initialN={initialN}
      initialAudience
    />
  )
}
