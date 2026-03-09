import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const operationsPassword = process.env.OPERATIONS_PASSWORD

    if (!operationsPassword) {
      logError('operations-login-missing-password', new Error('OPERATIONS_PASSWORD is not configured'))
      return NextResponse.json({ error: 'Operations login not configured' }, { status: 500 })
    }

    if (!password || password !== operationsPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await createSession({
      userId: 'operations',
      vippsSub: 'operations',
      isAdmin: false,
      role: 'operations',
      name: 'Operations',
    })

    const cookieStore = await cookies()
    cookieStore.set('tinglum_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('operations-login', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
