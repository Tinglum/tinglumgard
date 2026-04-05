import { NextRequest, NextResponse } from 'next/server'
import { recomputeForecastsForAllBreeds } from '@/lib/eggs/forecast'
import { logError } from '@/lib/logger'

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

async function runForecastSync(request: NextRequest) {
  const auth = getCronAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  const startedAt = Date.now()

  try {
    const result = await recomputeForecastsForAllBreeds()
    return NextResponse.json(
      {
        ...result,
        durationMs: Date.now() - startedAt,
      },
      { status: result.ok ? 200 : 500 }
    )
  } catch (error) {
    const durationMs = Date.now() - startedAt
    logError('cron-eggs-forecast-sync', error, { durationMs })
    return NextResponse.json(
      {
        error: 'Failed to recompute egg forecasts',
        detail: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return runForecastSync(request)
}

export async function POST(request: NextRequest) {
  return runForecastSync(request)
}
