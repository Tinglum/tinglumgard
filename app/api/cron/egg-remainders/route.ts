import { NextRequest, NextResponse } from 'next/server';
import { runEmailFlowRunner } from '@/lib/email/lifecycle';

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token');
  return token === secret;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runEmailFlowRunner();
  return NextResponse.json(
    {
      success: result.ok,
      compatibilityMode: true,
      delegatedTo: '/api/cron/email-flow-runner',
      summary: result.summary,
      error: result.error || null,
    },
    { status: result.ok ? 200 : 500 }
  );
}
