import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}))
    const userAgent = request.headers.get('user-agent') || null
    const forwardedFor = request.headers.get('x-forwarded-for') || null

    console.error('CLIENT_RUNTIME_ERROR', {
      userAgent,
      forwardedFor,
      payload,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('CLIENT_RUNTIME_ERROR_LOG_FAILED', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

