import { NextRequest, NextResponse } from 'next/server';
import { processEmailDispatchBatch } from '@/lib/email/dispatch';
import { getEmailSchemaStatus } from '@/lib/email/schema';

async function getCronAuth(request: NextRequest): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  detail?: string;
}> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: 'CRON_SECRET is not configured on server',
      detail: 'Set CRON_SECRET in hosting environment variables',
    };
  }

  const token = request.headers.get('x-cron-secret');
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Missing cron token',
      detail: 'Send token in x-cron-secret header',
    };
  }

  const { timingSafeEqual } = await import('crypto');
  const secretBuf = Buffer.from(secret);
  const tokenBuf = Buffer.from(token);
  const valid = secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf);
  if (!valid) {
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
  let stage: 'auth' | 'schema' | 'run' = 'auth';
  try {
    const auth = await getCronAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status });
    }

    stage = 'schema';
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

    stage = 'run';
    const result = await processEmailDispatchBatch();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dispatch error';
    return NextResponse.json(
      {
        error: 'Email dispatch failed',
        stage,
        detail: message,
        env: {
          cronSecret: Boolean(process.env.CRON_SECRET),
          supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          mailgunApiKey: Boolean(process.env.MAILGUN_API_KEY),
          mailgunDomain: Boolean(process.env.MAILGUN_DOMAIN),
        },
      },
      { status: 500 }
    );
  }
}
