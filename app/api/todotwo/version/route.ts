import { NextResponse } from 'next/server'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoBuildVersion } from '@/lib/todotwo/pwa/version'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(
    { version: getTodoTwoBuildVersion() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
