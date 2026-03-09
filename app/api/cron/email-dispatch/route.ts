import { NextRequest, NextResponse } from 'next/server';
import { processEmailDispatchBatch } from '@/lib/email/dispatch';

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token');
  return token === secret;
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processEmailDispatchBatch();
  return NextResponse.json(result);
}
