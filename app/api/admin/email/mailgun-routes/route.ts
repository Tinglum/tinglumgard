import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY || '';
  const domain = process.env.MAILGUN_DOMAIN || '';
  const region = process.env.MAILGUN_REGION || 'eu';
  const apiBase = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
  return { apiKey, domain, region, apiBase };
}

function authHeader(apiKey: string) {
  return `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`;
}

/** GET — list all Mailgun routes */
export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { apiKey, domain, apiBase } = getMailgunConfig();
  if (!apiKey || !domain) {
    return NextResponse.json({
      error: 'Mailgun not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN missing)',
      routes: [],
      domain,
      apiBase,
    });
  }

  try {
    const response = await fetch(`${apiBase}/v3/routes?limit=100`, {
      headers: { Authorization: authHeader(apiKey) },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({
        error: `Mailgun API returned ${response.status}: ${text}`,
        routes: [],
        domain,
        apiBase,
      });
    }

    const data = await response.json();
    const routes = (data.items || []).map((route: Record<string, unknown>) => ({
      id: route.id,
      priority: route.priority,
      description: route.description,
      expression: route.expression,
      actions: route.actions,
      created_at: route.created_at,
    }));

    return NextResponse.json({
      routes,
      total: data.total_count || routes.length,
      domain,
      apiBase,
      expectedWebhookUrl: resolveExpectedWebhookUrl(),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch Mailgun routes',
      routes: [],
      domain,
      apiBase,
    });
  }
}

/** POST — create or update a Mailgun inbound route */
export async function POST(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { apiKey, domain, apiBase } = getMailgunConfig();
  if (!apiKey || !domain) {
    return NextResponse.json(
      { error: 'Mailgun not configured' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');

  // Update an existing route's forward URL
  if (action === 'update_forward') {
    const routeId = String(body?.routeId || '');
    const forwardUrl = String(body?.forwardUrl || '').trim();
    if (!routeId || !forwardUrl) {
      return NextResponse.json({ error: 'routeId and forwardUrl required' }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append('action', `forward("${forwardUrl}")`);
    formData.append('action', 'stop()');

    const response = await fetch(`${apiBase}/v3/routes/${routeId}`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader(apiKey),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: `Mailgun API ${response.status}: ${data?.message || 'Failed'}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, route: data });
  }

  // Create a new inbound route for reply processing
  if (action === 'create_inbound') {
    const recipientMatch = String(body?.recipientMatch || `match_recipient("messages@${domain}")`);
    const forwardUrl = String(body?.forwardUrl || resolveExpectedWebhookUrl());

    const formData = new URLSearchParams();
    formData.append('priority', '0');
    formData.append('description', 'Tinglumgard inbound reply processing');
    formData.append('expression', recipientMatch);
    formData.append('action', `forward("${forwardUrl}")`);
    formData.append('action', 'stop()');

    const response = await fetch(`${apiBase}/v3/routes`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(apiKey),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: `Mailgun API ${response.status}: ${data?.message || 'Failed'}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, route: data });
  }

  // Delete a route
  if (action === 'delete') {
    const routeId = String(body?.routeId || '');
    if (!routeId) {
      return NextResponse.json({ error: 'routeId required' }, { status: 400 });
    }

    const response = await fetch(`${apiBase}/v3/routes/${routeId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader(apiKey) },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: `Mailgun API ${response.status}: ${data?.message || 'Failed'}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

function resolveExpectedWebhookUrl(): string {
  const configuredUrl = String(
    process.env.MAILGUN_REPLY_WEBHOOK_URL ||
      process.env.EMAIL_REPLY_WEBHOOK_URL ||
      process.env.INBOUND_EMAIL_WEBHOOK_URL ||
      ''
  ).trim();

  if (configuredUrl) {
    if (configuredUrl.includes('/api/webhooks/email-reply')) return configuredUrl;
    try {
      const url = new URL(configuredUrl);
      url.pathname = '/api/webhooks/email-reply';
      return url.toString();
    } catch {
      return `${configuredUrl.replace(/\/+$/, '')}/api/webhooks/email-reply`;
    }
  }

  return 'https://main--tinglum.netlify.app/api/webhooks/email-reply';
}
