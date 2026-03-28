import { dispatchEmail } from '@/lib/email/dispatch';
import { supabaseAdmin } from '@/lib/supabase/server';

type AdminThreadInput = {
  customerName?: string | null;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  message: string;
  adminName: string;
  sourcePath: string;
  orderId?: string | null;
  locale?: 'no' | 'en';
  metadata?: Record<string, unknown>;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function buildAdminMessageHtml(input: {
  subject: string;
  message: string;
  customerName?: string | null;
  adminName: string;
  minSideUrl: string;
}) {
  const greetingName = String(input.customerName || '').trim();
  const greeting = greetingName ? `Hei ${escapeHtml(greetingName)},` : 'Hei,';
  const paragraphs = String(input.message || '')
    .split(/\r?\n\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(
      (part) =>
        `<p style="margin:0 0 14px;color:#1f2937;font-size:16px;line-height:1.6;">${escapeHtml(part).replace(/\r?\n/g, '<br />')}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${escapeHtml(input.subject)}</title>
    </head>
    <body style="margin:0;background:#f8f4ec;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;padding:24px 12px;">
        <div style="overflow:hidden;border-radius:18px;border:1px solid #eadfd2;background:#ffffff;">
          <div style="padding:22px 28px;background:#2f1b12;color:#ffffff;">
            <div style="font-size:15px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.82;">Tinglum Gard</div>
            <div style="margin-top:6px;font-size:30px;font-weight:700;line-height:1.1;">${escapeHtml(input.subject)}</div>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 18px;color:#111827;font-size:16px;line-height:1.6;">${greeting}</p>
            ${paragraphs}
            <div style="margin-top:20px;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f0;">
              <p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.5;">Du kan svare direkte på denne e-posten eller logge inn på Min side for å fortsette samtalen.</p>
              <a href="${escapeHtml(input.minSideUrl)}" style="display:inline-block;background:#2f1b12;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:12px;">Åpne Min side</a>
            </div>
            <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.6;">Vennlig hilsen,</p>
              <p style="margin:0;color:#111827;font-size:18px;font-weight:700;">${escapeHtml(input.adminName)}</p>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export async function createAdminInitiatedCustomerThread(input: AdminThreadInput) {
  const customerEmail = normalizeEmail(input.customerEmail);
  const customerPhone = String(input.customerPhone || '').trim();
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();
  const adminName = String(input.adminName || '').trim() || 'Tinglum Gard';

  if (!customerEmail) {
    throw new Error('Recipient email is required');
  }
  if (!customerPhone) {
    throw new Error('Recipient phone is required to create a message thread');
  }
  if (!subject) {
    throw new Error('Subject is required');
  }
  if (!message) {
    throw new Error('Message is required');
  }

  const { data: newMessage, error } = await supabaseAdmin
    .from('customer_messages')
    .insert({
      order_id: input.orderId || null,
      customer_phone: customerPhone,
      customer_name: input.customerName || null,
      customer_email: customerEmail,
      subject,
      message,
      message_type: 'support',
      status: 'open',
      priority: 'normal',
      admin_initiated: true,
      admin_sender: adminName,
    })
    .select('id, email_thread_id, subject, customer_email, customer_phone, customer_name')
    .single();

  if (error || !newMessage) {
    throw new Error(error?.message || 'Failed to create customer message thread');
  }

  const threadId = String(newMessage.email_thread_id || `msg_${newMessage.id}`);
  const appBaseUrl = String(process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no').replace(/\/+$/, '');
  const html = buildAdminMessageHtml({
    subject,
    message,
    customerName: input.customerName || null,
    adminName,
    minSideUrl: `${appBaseUrl}/min-side`,
  });

  const emailResult = await dispatchEmail({
    to: customerEmail,
    toPhone: customerPhone,
    subject: `[${threadId}] ${subject}`,
    html,
    classification: 'support',
    locale: input.locale === 'en' ? 'en' : 'no',
    templateKey: 'admin.direct.customer.message',
    sourcePath: input.sourcePath,
    customerMessageId: newMessage.id,
    metadata: {
      admin_initiated: true,
      admin_sender: adminName,
      thread_id: threadId,
      ...(input.metadata || {}),
    },
  });

  return {
    message: newMessage,
    threadId,
    emailResult,
  };
}