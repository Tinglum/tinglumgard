import { NextRequest, NextResponse } from 'next/server';
import { processEmailDispatchBatch } from '@/lib/email/dispatch';
import { getEmailSchemaStatus } from '@/lib/email/schema';

function getCronAuth(request: NextRequest): {
  ok: boolean;
  status: number;
  error?: string;
  detail?: string;
} {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: 'CRON_SECRET is not configured on server',
      detail: 'Set CRON_SECRET in hosting environment variables',
    };
  }

  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token');
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Missing cron token',
      detail: 'Send token in x-cron-secret header or ?token= query parameter',
    };
  }

  if (token !== secret) {
    return {
      ok: false,
      status: 401,
      error: 'Invalid cron token',
      detail: 'CRON_SECRET mismatch between GitHub workflow and hosting environment',
    };
  }

  return { ok: true, status: 200 };
}

export async function POST(request: NextRequest) {
  const auth = getCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status });
  }

  const schema = await getEmailSchemaStatus(['email_dispatch_queue']);
  if (!schema.ready) {
    return NextResponse.json(
      {
        error: 'Email schema is not fully migrated',
        missingTables: schema.missingTables,
      },
      { status: 503 }
    );
  }

  try {
    const result = await processEmailDispatchBatch();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dispatch error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
