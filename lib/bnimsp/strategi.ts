import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp } from '@/lib/bnimsp/access'
import { logError } from '@/lib/logger'

// The internal method document for BNI Norge and the consultants. It lives in
// content/ (not public/) so it is only ever served to signed-in portal users.
// next.config.js traces content/bnistrategi into these route handlers.
const DIR = path.join(process.cwd(), 'content', 'bnistrategi')

const FILES = {
  html: {
    name: 'index.html',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    returnTo: '/bnimsp/strategi',
  },
  pdf: {
    name: 'BNI-er-en-arbeidsmetode.pdf',
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="BNI-er-en-arbeidsmetode.pdf"',
    },
    returnTo: '/bnimsp/strategi/pdf',
  },
} as const

export async function serveStrategiFile(request: Request, kind: keyof typeof FILES) {
  const file = FILES[kind]

  const session = await getBnimspSession()
  if (!canViewBnimsp(session)) {
    const login = new URL('/bnimsp/login', request.url)
    login.searchParams.set('next', file.returnTo)
    return NextResponse.redirect(login)
  }

  try {
    const body = await readFile(path.join(DIR, file.name))
    return new NextResponse(body, {
      headers: {
        ...file.headers,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (err) {
    logError('bnimsp-strategi', err)
    return NextResponse.json({ error: 'Dokumentet er ikke tilgjengelig' }, { status: 500 })
  }
}
