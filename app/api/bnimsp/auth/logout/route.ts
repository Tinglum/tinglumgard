import { NextResponse } from 'next/server'
import { clearBnimspSession } from '@/lib/bnimsp/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  await clearBnimspSession()
  return NextResponse.json({ ok: true })
}
