import { NextRequest, NextResponse } from 'next/server'
import { processEggWaitlistQueue } from '@/lib/eggs/waitlist'
import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'

function getCronAuth(request: NextRequest): {
  ok: boolean
  status: number
  error?: string
  detail?: string
} {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: 'CRON_SECRET is not configured on server',
      detail: 'Set CRON_SECRET in hosting environment variables',
    }
  }

  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token')
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Missing cron token',
      detail: 'Send token in x-cron-secret header or ?token= query parameter',
    }
  }

  if (token !== secret) {
    return {
      ok: false,
      status: 401,
      error: 'Invalid cron token',
      detail: 'CRON_SECRET mismatch between GitHub workflow and hosting environment',
    }
  }

  return { ok: true, status: 200 }
}

async function runWaitlistProcessor(request: NextRequest) {
  const auth = getCronAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  try {
    const requiredTables = ['egg_waitlist_entries', 'egg_inventory'] as const
    for (const table of requiredTables) {
      const { error } = await supabaseAdmin.from(table).select('id', { head: true, count: 'exact' })
      if (!error) continue

      const code = String((error as { code?: unknown })?.code || '').toLowerCase()
      const message = String((error as { message?: unknown })?.message || '').toLowerCase()
      const missingRelation =
        code === '42p01' ||
        code === '42703' ||
        code === 'pgrst204' ||
        code === 'pgrst205' ||
        (message.includes('relation') && message.includes('does not exist')) ||
        message.includes("could not find the table 'public.")

      if (missingRelation) {
        return NextResponse.json(
          {
            error: 'Egg waitlist schema is not fully migrated',
            missingTables: [table],
            detail: (error as { message?: string }).message ?? 'Unknown schema error',
          },
          { status: 503 }
        )
      }

      throw error
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

export async function GET(request: NextRequest) {
  return runWaitlistProcessor(request)
}

export async function POST(request: NextRequest) {
  return runWaitlistProcessor(request)
}
