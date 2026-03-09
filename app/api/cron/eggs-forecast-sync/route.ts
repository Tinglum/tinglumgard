import { NextRequest, NextResponse } from 'next/server'
import { recomputeForecastsForAllBreeds } from '@/lib/eggs/forecast'

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token')
  return token === secret
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await recomputeForecastsForAllBreeds()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
