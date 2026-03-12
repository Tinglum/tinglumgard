import { NextResponse } from 'next/server'
import { listMyEggWishlistRequests } from '@/lib/eggs/wishlist'

export async function GET() {
  const result = await listMyEggWishlistRequests()
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result.requests, { status: 200 })
}

