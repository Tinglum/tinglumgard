const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'lib', 'email', 'render.ts');
let content = fs.readFileSync(filePath, 'utf8');

const functionStart = content.indexOf('function normalizeEggReminderVariables(');
const functionEnd = content.indexOf('export function interpolateTemplate', functionStart);

if (functionStart === -1 || functionEnd === -1) {
  throw new Error('Could not locate normalizeEggReminderVariables block');
}

const replacementFunction = `function normalizeEggReminderVariables(
  input: Record<string, unknown>,
  locale: EmailLocale,
): Record<string, unknown> {
  const vars = { ...input };
  const daysLeft = Number(vars.days_left ?? 0);
  const defaultReminderDays = [11, 9, 7, 6];
  const totalReminders =
    Number(vars.total_reminders ?? 0) > 0 ? Number(vars.total_reminders) : defaultReminderDays.length;
  const reminderNumber =
    Number(vars.reminder_number ?? 0) > 0
      ? Number(vars.reminder_number)
      : Math.max(1, defaultReminderDays.indexOf(daysLeft) + 1 || 0);

  if (!vars.total_reminders && totalReminders > 0) {
    vars.total_reminders = totalReminders;
  }
  if (!vars.reminder_number && reminderNumber > 0) {
    vars.reminder_number = reminderNumber;
  }

  if (vars.reminder_badge_label && vars.reminder_intro_html && vars.reminder_support_html && vars.reminder_consequence_html) {
    return vars;
  }

  const isFirstFriendlyReminder = daysLeft === 11 || reminderNumber === 1;
  const isSecondFriendlyReminder = daysLeft === 9 || reminderNumber === 2;

  if (locale === 'en') {
    if (isFirstFriendlyReminder) {
      vars.reminder_badge_label = vars.reminder_badge_label || 'Friendly reminder';
      vars.reminder_intro_html =
        vars.reminder_intro_html ||
        '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">We are looking forward to sending your hatching eggs, and this is simply an early and friendly reminder about the remaining balance for order <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">You still have plenty of time. We are sending this now so you can settle the payment whenever it suits you best.</p>';
      vars.reminder_support_html =
        vars.reminder_support_html ||
        '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">If you have already paid, you can ignore this email. If you have any questions about your order, just reply and we will gladly help.</p></div>';
      vars.reminder_consequence_html =
        vars.reminder_consequence_html ||
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #E8DFD5;background:#FAF8F5;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Your order remains reserved for you until the payment deadline. If the balance is still not registered by then, the order will eventually be cancelled and the eggs released to other customers.</p></td></tr></table>';
      return vars;
    }

    if (isSecondFriendlyReminder) {
      vars.reminder_badge_label = vars.reminder_badge_label || 'Friendly reminder';
      vars.reminder_intro_html =
        vars.reminder_intro_html ||
        '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">This is another friendly reminder about the remaining balance for order <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">As soon as the payment is registered, everything is ready for the next step toward shipment in the correct week.</p>';
      vars.reminder_support_html =
        vars.reminder_support_html ||
        '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">If you have already paid, or if you have any questions about the order, just reply to this email. We are happy to help.</p></div>';
      vars.reminder_consequence_html =
        vars.reminder_consequence_html ||
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #FDE68A;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">We are still holding your place, but the remaining balance needs to be registered by the deadline for delivery to stay on schedule.</p></td></tr></table>';
      return vars;
    }

    vars.reminder_badge_label = vars.reminder_badge_label || 'Reminder';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Your hatching egg order <strong>{{order_number}}</strong> has not yet been fully paid.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">The remaining balance must be paid before the deadline to secure delivery.</p>';
    vars.reminder_support_html = vars.reminder_support_html || '';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #B45309;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">If the remaining balance is not paid before the deadline, your order will be cancelled and the eggs released to other customers.</p></td></tr></table>';
    return vars;
  }

  if (isFirstFriendlyReminder) {
    vars.reminder_badge_label = vars.reminder_badge_label || 'Vennlig p&aring;minnelse';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Vi gleder oss til &aring; sende rugeeggene dine, og vil bare gi deg en tidlig og vennlig p&aring;minnelse om restbetalingen for bestilling <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Du har fortsatt god tid. Vi sender denne meldingen n&aring; slik at du kan ordne betalingen n&aring;r det passer deg best.</p>';
    vars.reminder_support_html =
      vars.reminder_support_html ||
      '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Hvis du allerede har betalt, kan du se bort fra denne e-posten. Har du sp&oslash;rsm&aring;l om bestillingen, er det bare &aring; svare oss.</p></div>';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #E8DFD5;background:#FAF8F5;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Bestillingen beholdes for deg frem til betalingsfristen. Dersom restbel&oslash;pet ikke er registrert innen fristen, blir ordren til slutt kansellert og eggene frigitt til andre kunder.</p></td></tr></table>';
    return vars;
  }

  if (isSecondFriendlyReminder) {
    vars.reminder_badge_label = vars.reminder_badge_label || 'Vennlig p&aring;minnelse';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Dette er en ny vennlig p&aring;minnelse om restbetalingen for bestilling <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">N&aring;r betalingen er registrert, er alt klart videre mot utsending i riktig uke.</p>';
    vars.reminder_support_html =
      vars.reminder_support_html ||
      '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Hvis du allerede har betalt, eller lurer p&aring; noe rundt ordren, er det bare &aring; svare oss. Vi hjelper gjerne.</p></div>';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #FDE68A;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">Vi holder fortsatt av plassen din, men restbel&oslash;pet m&aring; v&aelig;re registrert innen fristen for at leveringen skal g&aring; som planlagt.</p></td></tr></table>';
    return vars;
  }

  vars.reminder_badge_label = vars.reminder_badge_label || 'P&aring;minnelse';
  vars.reminder_intro_html =
    vars.reminder_intro_html ||
    '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Din rugeegg-bestilling <strong>{{order_number}}</strong> er ikke ferdig betalt.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Restbel&oslash;pet m&aring; betales innen fristen for &aring; sikre leveransen.</p>';
  vars.reminder_support_html = vars.reminder_support_html || '';
  vars.reminder_consequence_html =
    vars.reminder_consequence_html ||
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #B45309;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">Hvis restbel&oslash;pet ikke betales innen fristen, vil bestillingen bli kansellert og eggene frigitt til andre kunder.</p></td></tr></table>';

  return vars;
}

`;

content = content.slice(0, functionStart) + replacementFunction + content.slice(functionEnd);

const helperMarker = '// ── Email Component Helpers';
const helperIndex = content.indexOf(helperMarker);

if (helperIndex === -1) {
  throw new Error('Could not locate helper marker');
}

const decodeHelper = `function decodeBasicHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aring;/g, 'å')
    .replace(/&oslash;/g, 'ø')
    .replace(/&aelig;/g, 'æ')
    .replace(/&Aring;/g, 'Å')
    .replace(/&Oslash;/g, 'Ø')
    .replace(/&AElig;/g, 'Æ')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '--');
}

`;

if (!content.includes('function decodeBasicHtmlEntities(')) {
  content = content.slice(0, helperIndex) + decodeHelper + content.slice(helperIndex);
}

const plainStart = content.indexOf('export function htmlToPlainText(html: string): string {');
const plainEnd = content.indexOf('\n}', plainStart);

if (plainStart === -1 || plainEnd === -1) {
  throw new Error('Could not locate htmlToPlainText block');
}

const replacementPlain = `export function htmlToPlainText(html: string): string {
  return decodeBasicHtmlEntities(
    html
      .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
      .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
      .replace(/<br\\s*\\/?>/gi, '\\n')
      .replace(/<\\/p>/gi, '\\n\\n')
      .replace(/<\\/div>/gi, '\\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\n{3,}/g, '\\n\\n')
      .replace(/[ \\t]{2,}/g, ' ')
      .trim(),
  );
}`;

content = content.slice(0, plainStart) + replacementPlain + content.slice(plainEnd + 2);

fs.writeFileSync(filePath, content, 'utf8');
