import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canViewBnimsp, canEditBnimsp, getBnimspRole } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { BniHeader } from '@/components/bnimsp/BniHeader'
import { Studio } from '@/components/bnimsp/Studio'

export const dynamic = 'force-dynamic'

export default async function StudioPage({
  searchParams,
}: {
  searchParams: { s?: string }
}) {
  const session = await getSession()
  if (!canViewBnimsp(session)) redirect('/bnimsp/login')

  const canEdit = canEditBnimsp(session)
  // Editors work against drafts so they see unpublished edits live.
  const { content } = await loadContent(canEdit ? 'draft' : 'published')
  const initialN = Number(searchParams.s) || 1

  return (
    <>
      <BniHeader active="studio" name={session?.name} canEdit={canEdit} />
      <Studio
        initialContent={content}
        canEdit={canEdit}
        isDirector={getBnimspRole(session) === 'director'}
        initialN={initialN}
      />
    </>
  )
}
