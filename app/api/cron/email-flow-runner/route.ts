import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runEmailFlowRunner } from '@/lib/email/lifecycle';
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

  // Accept token only from the header — never from query params (logged in server/proxy logs).
  const token = request.headers.get('x-cron-secret');
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Missing cron token',
      detail: 'Send token in x-cron-secret header',
    };
  }

  // Timing-safe comparison prevents secret-length oracle attacks.
  const secretBuf = Buffer.from(secret);
  const tokenBuf = Buffer.from(token);
  const valid =
    secretBuf.length === tokenBuf.length &&
    timingSafeEqual(secretBuf, tokenBuf);

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
    const auth = getCronAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status });
    }

    stage = 'schema';
    const schema = await getEmailSchemaStatus([
      'email_templates',
      'email_flows',
      'email_dispatch_queue',
      'email_flow_instances',
      'email_flow_runs',
    ]);
    if (!schema.ready) {
      return NextResponse.json(
        {
          error: 'Email schema is not fully migrated',
          missingTables: schema.missingTables,
          hint: 'Run migration 20260310210000_repair_unified_email_schema.sql',
        },
        { status: 503 }
      );
    }

    stage = 'run';
    const result = await runEmailFlowRunner();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown flow runner error';
    return NextResponse.json(
      {
        error: 'Email flow runner failed',
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
