import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const check = searchParams.get('check');

    switch (check) {
      case 'webhooks':
        return await checkWebhookHealth();

      case 'payments':
        return await checkPaymentHealth();

      case 'inventory':
        return await checkInventoryHealth();

      case 'emails':
        return await checkEmailHealth();

      case 'orders':
        return await checkOrderHealth();

      case 'all':
      default:
        return await performFullHealthCheck();
    }
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed', status: 'unhealthy' },
      { status: 500 }
    );
  }
}

async function performFullHealthCheck() {
  const checks = await Promise.all([
    checkWebhookHealth(),
    checkPaymentHealth(),
    checkInventoryHealth(),
    checkEmailHealth(),
    checkOrderHealth(),
  ]);

  const results = await Promise.all(checks.map(c => c.json()));

  const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      webhooks: results[0],
      payments: results[1],
      inventory: results[2],
      emails: results[3],
      orders: results[4],
    },
  });
}

async function checkWebhookHealth() {
  // Check recent webhook activity
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: webhookLogs, error } = await supabaseAdmin
    .from('webhook_log')
    .select('*')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check webhook logs',
      error: error.message,
    });
  }

  const totalWebhooks = webhookLogs?.length || 0;
  const failedWebhooks = webhookLogs?.filter(w => w.status === 'failed') || [];
  const successRate = totalWebhooks > 0 ? ((totalWebhooks - failedWebhooks.length) / totalWebhooks) * 100 : 100;

  return NextResponse.json({
    status: successRate > 95 ? 'healthy' : successRate > 80 ? 'degraded' : 'unhealthy',
    total_webhooks_24h: totalWebhooks,
    failed_webhooks_24h: failedWebhooks.length,
    success_rate: Math.round(successRate),
    recent_failures: failedWebhooks.slice(0, 5).map(w => ({
      order_id: w.order_id,
      error: w.error_message,
      timestamp: w.created_at,
    })),
  });
}

async function checkPaymentHealth() {
  // Check for stuck payments
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      created_at,
      payments (
        id,
        status,
        payment_type,
        created_at
      )
    `)
    .in('status', ['draft', 'deposit_paid'])
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check payment health',
    });
  }

  // Find orders with pending payments older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stuckOrders = orders?.filter(order => {
    const hasPendingDeposit = order.status === 'draft' && new Date(order.created_at) < sevenDaysAgo;
    const hasPendingRemainder = order.status === 'deposit_paid' &&
      order.payments?.some((p: any) => p.payment_type === 'deposit' && new Date(p.created_at) < sevenDaysAgo);
    return hasPendingDeposit || hasPendingRemainder;
  }) || [];

  return NextResponse.json({
    status: stuckOrders.length === 0 ? 'healthy' : stuckOrders.length < 5 ? 'degraded' : 'unhealthy',
    stuck_payments: stuckOrders.length,
    pending_deposits: orders?.filter(o => o.status === 'draft').length || 0,
    pending_remainders: orders?.filter(o => o.status === 'deposit_paid').length || 0,
    at_risk_orders: stuckOrders.slice(0, 10).map(o => ({
      order_number: o.order_number,
      status: o.status,
      days_pending: Math.floor((Date.now() - new Date(o.created_at).getTime()) / (24 * 60 * 60 * 1000)),
    })),
  });
}

async function checkInventoryHealth() {
  // Check inventory levels and allocation
  const { data: config, error: configError } = await supabaseAdmin
    .from('config')
    .select('key, value')
    .in('key', ['max_kg_available', 'order_cutoff_date']);

  if (configError) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check inventory config',
    });
  }

  const maxKg = parseInt(config?.find(c => c.key === 'max_kg_available')?.value || '0');

  // Calculate allocated kg
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('box_size, status')
    .not('status', 'eq', 'cancelled');

  const allocatedKg = orders?.reduce((sum, o) => sum + o.box_size, 0) || 0;
  const remainingKg = maxKg - allocatedKg;
  const utilizationRate = maxKg > 0 ? (allocatedKg / maxKg) * 100 : 0;

  return NextResponse.json({
    status: remainingKg > 100 ? 'healthy' : remainingKg > 0 ? 'degraded' : 'critical',
    max_kg: maxKg,
    allocated_kg: allocatedKg,
    remaining_kg: remainingKg,
    utilization_rate: Math.round(utilizationRate),
    warning: remainingKg < 100 ? 'Low inventory - consider closing orders soon' : null,
  });
}

async function checkEmailHealth() {
  // Check email sending status in last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: emailLogs, error } = await supabaseAdmin
    .from('email_log')
    .select('*')
    .gte('sent_at', twentyFourHoursAgo);

  if (error) {
    return NextResponse.json({
      status: 'unknown',
      message: 'Email log table not found - this is optional',
    });
  }

  const totalEmails = emailLogs?.length || 0;

  return NextResponse.json({
    status: 'healthy',
    emails_sent_24h: totalEmails,
    message: totalEmails === 0 ? 'No emails sent in last 24h (this may be normal)' : `${totalEmails} emails sent`,
  });
}

async function checkOrderHealth() {
  // Check for data integrity issues
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_amount,
      deposit_amount,
      remainder_amount,
      payments (
        payment_type,
        amount_nok,
        status
      )
    `);

  if (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check order health',
    });
  }

  // Find orders with data integrity issues
  const issues: any[] = [];

  orders?.forEach(order => {
    // Check if amounts add up correctly
    const expectedTotal = order.deposit_amount + order.remainder_amount;
    if (Math.abs(expectedTotal - order.total_amount) > 1) {
      issues.push({
        order_number: order.order_number,
        issue: 'Amount mismatch',
        details: `Expected ${expectedTotal}, got ${order.total_amount}`,
      });
    }

    // Check for duplicate payments
    const depositPayments = order.payments?.filter((p: any) => p.payment_type === 'deposit') || [];
    const remainderPayments = order.payments?.filter((p: any) => p.payment_type === 'remainder') || [];

    if (depositPayments.length > 1) {
      issues.push({
        order_number: order.order_number,
        issue: 'Duplicate deposit payments',
        details: `${depositPayments.length} deposit payments found`,
      });
    }

    if (remainderPayments.length > 1) {
      issues.push({
        order_number: order.order_number,
        issue: 'Duplicate remainder payments',
        details: `${remainderPayments.length} remainder payments found`,
      });
    }
  });

  return NextResponse.json({
    status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'degraded' : 'unhealthy',
    total_orders: orders?.length || 0,
    integrity_issues: issues.length,
    issues: issues.slice(0, 10),
  });
}
