import { NextRequest, NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp, canEditBnimsp } from '@/lib/bnimsp/access'
import { loadContent, hasUnpublishedChanges } from '@/lib/bnimsp/content'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getBnimspSession()
    if (!canViewBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const wantsDraft = new URL(request.url).searchParams.get('mode') === 'draft'
    const mode = wantsDraft && canEditBnimsp(session) ? 'draft' : 'published'
    const { content, source } = await loadContent(mode)
    const dirty = canEditBnimsp(session) ? await hasUnpublishedChanges() : false
    return NextResponse.json({ content, source, mode, hasUnpublishedChanges: dirty })
  } catch (err) {
    logError('bnimsp-content-get', err)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
