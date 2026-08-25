import { NextRequest, NextResponse } from 'next/server'
import { sendViaMailgun } from '@/lib/email/provider-mailgun'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const expected = process.env.JWT_SECRET
  const provided = request.headers.get('x-bnimsp-email-secret') || ''
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const to = String(body.to || '').trim().toLowerCase()
    const subject = String(body.subject || '').trim()
    const html = String(body.html || '')
    const text = String(body.text || '')
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing email fields' }, { status: 400 })
    }
    const result = await sendViaMailgun({ to, subject, html, text })
    return NextResponse.json(result, { status: result.success ? 200 : 502 })
  } catch (error) {
    logError('bnimsp-email-relay', error)
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
  }
}
