import { NextRequest, NextResponse } from 'next/server'
import { processEggWaitlistQueue } from '@/lib/eggs/waitlist'
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET
    const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token')
    if (secret && token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await processEggWaitlistQueue()

    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (error) {
    logError('cron-egg-waitlist', error)
    return NextResponse.json({ error: 'Failed to process egg waitlist' }, { status: 500 })
  }
}
