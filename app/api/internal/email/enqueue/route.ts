import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { dispatchEmail } from '@/lib/email/dispatch';
import type { DispatchEmailInput } from '@/lib/email/types';

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_EMAIL_SECRET;
  if (!expected) return true;
  const incoming = request.headers.get('x-internal-email-secret') || '';
  return incoming === expected;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const adminAllowed = Boolean(session?.isAdmin);
  const internalAllowed = isAuthorized(request);

  if (!adminAllowed && !internalAllowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as DispatchEmailInput;
  if (!body?.to || !body?.subject || !body?.html) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await dispatchEmail(body);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
