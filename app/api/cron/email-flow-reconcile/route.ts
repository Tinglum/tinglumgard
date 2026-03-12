import { NextRequest, NextResponse } from 'next/server';
import { materializeLifecycleInstancesOnly } from '@/lib/email/lifecycle';
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
  let stage: 'auth' | 'schema' | 'run' = 'auth';
  try {
    const auth = getCronAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status });
    }

    stage = 'schema';
    const schema = await getEmailSchemaStatus(['email_templates', 'email_flows', 'email_flow_instances']);
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
    const result = await materializeLifecycleInstancesOnly();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown reconcile error';
    return NextResponse.json(
      {
        error: 'Email flow reconcile failed',
        stage,
        detail: message,
        env: {
          cronSecret: Boolean(process.env.CRON_SECRET),
          supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
      },
      { status: 500 }
    );
  }
}
