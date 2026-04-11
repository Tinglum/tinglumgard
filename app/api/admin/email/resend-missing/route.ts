import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { buildEggOrderLinesHtml, summarizeEggOrderLines } from '@/lib/eggs/email-lines';

/**
 * One-time admin endpoint to resend missing deposit/remainder confirmation
 * emails for egg orders. Only sends if no later email in the chain exists.
 *
 * Chain: deposit_confirmed → remainder_reminders → remainder_paid
 * If remainder_paid was sent, skip deposit_confirmed.
 * If any reminder was sent after deposit, skip deposit_confirmed.
 */

function formatOreToNok(amountOre: number): string {
  return `kr ${Math.round((Number(amountOre) || 0) / 100).toLocaleString('nb-NO')}`;
}

export async function POST() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';
  const results: Array<{
    orderId: string;
    orderNumber: string;
    email: string;
    action: string;
    sent: boolean;
    error?: string;
  }> = [];

  // Fetch all egg orders that should have received emails
  const { data: eggOrders } = await supabaseAdmin
    .from('egg_orders')
    .select(`
      id, order_number, customer_name, customer_email, status,
      total_amount, deposit_amount, remainder_amount,
      quantity, week_number, price_per_egg, delivery_fee, delivery_method, delivery_monday,
      breed_id,
      egg_breeds!egg_orders_breed_id_fkey ( name ),
      egg_order_additions ( quantity, price_per_egg, subtotal, breed_id, egg_breeds!egg_order_additions_breed_id_fkey ( name ) )
    `)
    .in('status', ['deposit_paid', 'fully_paid', 'shipped', 'delivered']);

  if (!eggOrders || eggOrders.length === 0) {
    return NextResponse.json({ message: 'No eligible egg orders found', results });
  }

  for (const order of eggOrders) {
    const email = String(order.customer_email || '').trim().toLowerCase();
    if (!email || email === 'pending@vipps.no') continue;

    const orderId = String(order.id);
    const orderNumber = String(order.order_number || '');

    // Check which emails have already been sent for this order
    const { data: sentEmails } = await supabaseAdmin
      .from('email_dispatch_queue')
      .select('template_key, status')
      .eq('egg_order_id', orderId)
      .in('status', ['sent', 'pending', 'processing']);

    const sentTemplates = new Set(
      (sentEmails || []).map((e: any) => String(e.template_key || ''))
    );

    // Also check legacy email_log
    const { data: legacySent } = await supabaseAdmin
      .from('email_log')
      .select('subject')
      .eq('recipient', email)
      .ilike('subject', `%${orderNumber}%`);

    const hasLegacyEmail = (legacySent || []).length > 0;

    const hasDepositConfirmation = sentTemplates.has('egg.order.deposit.confirmed.customer');
    const hasRemainderConfirmation = sentTemplates.has('egg.order.remainder.paid.customer');
    const hasAnyReminder = sentTemplates.has('egg.remainder.reminder');
    const hasDeliveryEmail = sentTemplates.has('egg.delivery.day_before');
    const hasShippedPlusOne = sentTemplates.has('egg.order.shipped.plus_one');
    const hasHatchFollowup = sentTemplates.has('egg.hatch.followup');
    const hasShippedEmail = sentTemplates.has('egg.order.shipped.customer');

    // Determine what to send
    const status = String(order.status || '');
    const isFullyPaidOrLater = ['fully_paid', 'shipped', 'delivered'].includes(status);

    // Build template variables
    const eggSummary = summarizeEggOrderLines(order as any, 'no');
    const baseQuantity = eggSummary.baseQuantity;
    const additionsQuantity = eggSummary.additionsQuantity;
    const totalQuantity = eggSummary.totalQuantity;
    const breedName = eggSummary.breedLabel || 'Rugeegg';
    const orderLinesHtml = buildEggOrderLinesHtml(eggSummary.lines, 'no', {
      deliveryFeeOre: Number((order as any).delivery_fee || 0),
      deliveryLabel: String((order as any).delivery_method || ''),
    });
    const orderLinesHtmlEn = buildEggOrderLinesHtml(summarizeEggOrderLines(order as any, 'en').lines, 'en', {
      deliveryFeeOre: Number((order as any).delivery_fee || 0),
      deliveryLabel: String((order as any).delivery_method || ''),
    });
    const orderUrl = buildCustomerOrderLink(appUrl, 'egg', orderId);

    // 1. Remainder confirmation: send if fully_paid+ and no confirmation sent
    if (isFullyPaidOrLater && !hasRemainderConfirmation) {
      // Don't skip — always send remainder confirmation if order is paid
      try {
        const rendered = await renderManagedTemplate({
          templateKey: 'egg.order.remainder.paid.customer',
          locale: 'no',
          variables: {
            customer_name: order.customer_name || 'Kunde',
            order_number: orderNumber,
            breed_name: breedName,
            base_quantity: baseQuantity,
            additions_quantity: additionsQuantity,
            total_quantity: totalQuantity,
            order_lines_html: orderLinesHtml,
            order_lines_html_en: orderLinesHtmlEn,
            total_amount_nok: formatOreToNok(order.total_amount),
            remainder_amount_nok: formatOreToNok(order.remainder_amount),
            order_url: orderUrl,
            tip_index: 1,
          },
        });

        if (rendered) {
          const result = await dispatchEmail({
            to: email,
            subject: rendered.subject,
            html: rendered.html,
            classification: 'transactional',
            templateKey: rendered.templateKey,
            sourcePath: '/api/admin/email/resend-missing',
            eggOrderId: orderId,
            metadata: { resend: true, reason: 'missing_remainder_confirmation' },
          });
          results.push({
            orderId, orderNumber, email,
            action: 'remainder_confirmation',
            sent: result.success && !result.skipped,
            error: result.error || result.skipReason || undefined,
          });
        }
      } catch (err) {
        results.push({
          orderId, orderNumber, email,
          action: 'remainder_confirmation',
          sent: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
      // If we sent remainder, no need to send deposit
      continue;
    }

    // 2. Deposit confirmation: send if deposit_paid and no confirmation or later email sent
    if (!hasDepositConfirmation && !hasLegacyEmail) {
      // Skip if any later email in the chain was already sent
      const hasLaterEmail =
        hasAnyReminder || hasDeliveryEmail || hasShippedPlusOne || hasHatchFollowup || hasShippedEmail;
      if (hasLaterEmail) {
        results.push({
          orderId, orderNumber, email,
          action: 'deposit_confirmation_skipped',
          sent: false,
          error: 'Later email already sent',
        });
        continue;
      }

      try {
        const rendered = await renderManagedTemplate({
          templateKey: 'egg.order.deposit.confirmed.customer',
          locale: 'no',
          variables: {
            customer_name: order.customer_name || 'Kunde',
            order_number: orderNumber,
            breed_name: breedName,
            week_number: order.week_number,
            base_quantity: baseQuantity,
            additions_quantity: additionsQuantity,
            total_quantity: totalQuantity,
            order_lines_html: orderLinesHtml,
            order_lines_html_en: orderLinesHtmlEn,
            total_amount_nok: formatOreToNok(order.total_amount),
            deposit_amount_nok: formatOreToNok(order.deposit_amount),
            remainder_amount_nok: formatOreToNok(order.remainder_amount),
            order_url: orderUrl,
            tip_index: 0,
          },
        });

        if (rendered) {
          const result = await dispatchEmail({
            to: email,
            subject: rendered.subject,
            html: rendered.html,
            classification: 'transactional',
            templateKey: rendered.templateKey,
            sourcePath: '/api/admin/email/resend-missing',
            eggOrderId: orderId,
            metadata: { resend: true, reason: 'missing_deposit_confirmation' },
          });
          results.push({
            orderId, orderNumber, email,
            action: 'deposit_confirmation',
            sent: result.success && !result.skipped,
            error: result.error || result.skipReason || undefined,
          });
        }
      } catch (err) {
        results.push({
          orderId, orderNumber, email,
          action: 'deposit_confirmation',
          sent: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  return NextResponse.json({
    message: `Processed ${eggOrders.length} orders, ${results.filter(r => r.sent).length} emails sent`,
    results,
  });
}
