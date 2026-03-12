import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { generateEggWishlistProposal } from '@/lib/eggs/wishlist'

function getCronToken(request: NextRequest): string {
  return String(request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token') || '')
}

function getLocalParts(date: Date, timezone: string) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date)
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hour12: false }).format(date))
  return { weekday, hour }
}

function verifyCronAuth(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return {
      ok: false as const,
      status: 500,
      error: 'CRON_SECRET is not configured on server',
    }
  }

  const token = getCronToken(request)
  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: 'Missing cron token',
    }
  }

  if (token !== secret) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid cron token',
    }
  }

  return { ok: true as const, status: 200 }
}

async function run(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const force = request.nextUrl.searchParams.get('force') === '1'
  const timezone = 'Europe/Oslo'
  const local = getLocalParts(new Date(), timezone)

  if (!force && (local.weekday !== 'Mon' || local.hour !== 8)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'outside_monday_window',
      local,
      timezone,
    })
  }

  try {
    const year = request.nextUrl.searchParams.get('year')
    const week = request.nextUrl.searchParams.get('week')
    const result = await generateEggWishlistProposal({
      year: Number.isFinite(Number(year)) ? Number(year) : undefined,
      weekNumber: Number.isFinite(Number(week)) ? Number(week) : undefined,
      persistEvents: true,
      createdBy: 'cron:egg-wishlist-proposal',
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      local,
      timezone,
      summary: result.summary,
      inventoryPool: result.inventoryPool || {},
    })
  } catch (error) {
    logError('cron-egg-wishlist-proposal', error)
    return NextResponse.json({ error: 'Failed to generate wishlist proposal' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}

