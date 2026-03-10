import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { sendChickenDepositConfirmationEmails } from '@/lib/chickens/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const includeAdmin = body?.includeAdmin !== false;
  const suffix = `manual-${Date.now()}`;

  const result = await sendChickenDepositConfirmationEmails({
    orderId: params.id,
    sourcePath: '/api/admin/chickens/orders/[id]/resend-confirmation',
    includeAdmin,
    idempotencySuffix: suffix,
  });

  if (!result.ok) {
    if (result.reason === 'order_query_failed') {
      return NextResponse.json(
        { error: 'Could not load order for resend', details: result.errorMessage || null },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!result.customerSent && !result.adminSent) {
    const reason = result.customerReason || result.adminReason || 'no_recipients_or_templates';
    return NextResponse.json(
      {
        error:
          reason.startsWith('template_not_found')
            ? 'Email template is missing for chicken confirmation'
            : reason === 'missing_customer_email'
              ? 'Customer email is missing on this order'
              : reason === 'missing_admin_email'
                ? 'Admin email is missing (EMAIL_FROM)'
                : 'No confirmation email was sent',
        reason,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    customerSent: result.customerSent,
    adminSent: result.adminSent,
    customerReason: result.customerReason || null,
    adminReason: result.adminReason || null,
  });
}
