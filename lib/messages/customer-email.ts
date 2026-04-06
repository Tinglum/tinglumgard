type CustomerMessageEmailLocale = 'no' | 'en';

interface BuildCustomerMessageEmailInput {
  locale: CustomerMessageEmailLocale;
  customerName?: string | null;
  adminName?: string | null;
  subjectLine: string;
  messageText: string;
  portalUrl: string;
  portalLabel: string;
  orderContextHtml?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMessageHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

function getFirstName(customerName: string | null | undefined, locale: CustomerMessageEmailLocale) {
  const trimmed = String(customerName || '').trim();
  if (!trimmed) {
    return locale === 'en' ? 'there' : 'der';
  }

  return trimmed.split(/\s+/)[0];
}

function getFarmName(locale: CustomerMessageEmailLocale) {
  return locale === 'en' ? 'Tinglum Gard' : 'Tinglum Gård';
}

function getSubjectPrefix(locale: CustomerMessageEmailLocale) {
  return locale === 'en' ? 'Message from Tinglum Gard' : 'Melding fra Tinglum Gård';
}

function getSenderLine(locale: CustomerMessageEmailLocale, adminName?: string | null) {
  const farmName = getFarmName(locale);
  const trimmedAdminName = String(adminName || '').trim();

  if (!trimmedAdminName) {
    return locale === 'en'
      ? `${farmName} has sent you a message.`
      : `${farmName} har sendt deg en melding.`;
  }

  const includesFarmName = trimmedAdminName.toLowerCase().includes(farmName.toLowerCase());
  if (locale === 'en') {
    return includesFarmName
      ? `${escapeHtml(trimmedAdminName)} has sent you a message.`
      : `${escapeHtml(trimmedAdminName)} from ${farmName} has sent you a message.`;
  }

  return includesFarmName
    ? `${escapeHtml(trimmedAdminName)} har sendt deg en melding.`
    : `${escapeHtml(trimmedAdminName)} fra ${farmName} har sendt deg en melding.`;
}

function getOpenLabel(locale: CustomerMessageEmailLocale) {
  return locale === 'en' ? 'Open message' : 'Åpne meldingen';
}

function getReplyHint(locale: CustomerMessageEmailLocale, portalLabel: string) {
  if (locale === 'en') {
    return `You can reply directly to this email or open the message in ${escapeHtml(portalLabel)}.`;
  }

  return `Du kan svare direkte på denne e-posten eller åpne meldingen i ${escapeHtml(portalLabel)}.`;
}

export function buildCustomerMessageEmail(input: BuildCustomerMessageEmailInput) {
  const locale = input.locale;
  const firstName = escapeHtml(getFirstName(input.customerName, locale));
  const subjectLine = String(input.subjectLine || '').trim();
  const subject = `${getSubjectPrefix(locale)}: ${subjectLine}`.trim();
  const messageHtml = formatMessageHtml(String(input.messageText || '').trim());
  const orderContextHtml = input.orderContextHtml || '';
  const senderLine = getSenderLine(locale, input.adminName);
  const replyHint = getReplyHint(locale, input.portalLabel);
  const openLabel = getOpenLabel(locale);

  const greeting = locale === 'en' ? `Hi ${firstName},` : `Hei ${firstName},`;

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr>
    <td style="padding:32px 24px;">
      <p style="margin:0;font-size:16px;line-height:1.5;">${greeting}</p>
      <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">${senderLine}</p>
      ${orderContextHtml}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
        <tr>
          <td style="border:1px solid #D7D0C7;border-left:4px solid #2D6A4F;border-radius:10px;padding:16px 18px;background:#FFFFFF;font-size:15px;line-height:1.7;color:#2F241F;white-space:normal;">
            ${messageHtml}
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">${replyHint}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
        <tr>
          <td style="background-color:#2C1810;border-radius:10px;text-align:center;">
            <a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">${openLabel}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  return { subject, html };
}
