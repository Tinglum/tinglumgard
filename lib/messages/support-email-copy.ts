const SUPPORT_TEMPLATE_KEYS = new Set([
  'support.message.customer.confirmation',
  'support.reply.customer.notification',
  'support.message.customer.admin_initiated',
  'support.message.admin.new',
  'support.reply.admin.notification',
]);

function normalizeSpacing(value: string) {
  return value
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
}

function sanitizeSupportSubject(subject: string) {
  return normalizeSpacing(subject.replace(/^\[msg_[^\]]+\]\s*/i, ''));
}

function sanitizeSupportHtml(html: string) {
  return html
    .replace(
      /Vi har mottatt meldingen din \(sak msg_[^)]+\)\./gi,
      'Vi har mottatt meldingen din.'
    )
    .replace(
      /We have received your message \(case msg_[^)]+\)\./gi,
      'We have received your message.'
    )
    .replace(
      /([^<]+?) har svart p(?:&aring;|\u00E5) saken din \(msg_[^)]+\)\./gi,
      '$1 har svart.'
    )
    .replace(
      /([^<]+?) has replied to your case \(msg_[^)]+\)\./gi,
      '$1 has replied.'
    )
    .replace(
      /([^<]+?) har sendt deg en melding fra Tinglum G(?:&aring;|\u00E5)rd \(sak msg_[^)]+\)\./gi,
      '$1 har sendt deg en melding fra Tinglum G&aring;rd.'
    )
    .replace(
      /([^<]+?) has sent you a message from Tinglum Gard \(case msg_[^)]+\)\./gi,
      '$1 has sent you a message from Tinglum Gard.'
    )
    .replace(
      /Ny melding fra ([^<]+?) \(sak msg_[^)]+\)\./gi,
      'Ny melding fra $1.'
    )
    .replace(
      /New message from ([^<]+?) \(case msg_[^)]+\)\./gi,
      'New message from $1.'
    )
    .replace(
      /Svar fra ([^<]+?) p(?:&aring;|\u00E5) sak msg_[^.]+\./gi,
      'Svar fra $1.'
    )
    .replace(
      /Reply from ([^<]+?) on case msg_[^.]+\./gi,
      'Reply from $1.'
    )
    .replace(
      /Du kan svare direkte p(?:&aring;|\u00E5) denne e-posten,? eller g(?:&aring;|\u00E5) til <a href="([^"]+)">([^<]+)<\/a>\./gi,
      'For \u00E5 svare p\u00E5 meldingen, logg inn p\u00E5 <a href="$1">$2</a>.'
    )
    .replace(
      /You can reply directly to this email,? or visit <a href="([^"]+)">([^<]+)<\/a>\./gi,
      'To reply to the message, sign in to <a href="$1">$2</a>.'
    )
    .replace(
      /Bare svar p(?:&aring;|\u00E5) denne e-posten(?:\s|&nbsp;|&#160;|&mdash;|—|-)+vi hjelper deg gjerne\./gi,
      'For \u00E5 svare p\u00E5 meldingen, logg inn p\u00E5 Min side.'
    )
    .replace(
      /Just reply to this email(?:\s|&nbsp;|&#160;|&mdash;|—|-)+we(?:'|&#39;)ll gladly help\./gi,
      'Log in to My page to reply to the message.'
    )
    .replace(
      /Svar p(?:&aring;|\u00E5) denne e-posten direkte for \u00E5 svare kunden\./gi,
      '\u00C5pne kundemeldinger i admin for \u00E5 svare kunden.'
    )
    .replace(
      /Reply directly to this email to answer the customer\./gi,
      'Open admin messages to reply to the customer.'
    )
    .replace(/\s*\(sak msg_[^)]+\)/gi, '')
    .replace(/\s*\(case msg_[^)]+\)/gi, '')
    .replace(/\u00E5pne saken i/gi, '\u00E5pne meldingen i')
    .replace(/open the thread in/gi, 'open the message in');
}

export function sanitizeSupportEmailCopy(input: {
  templateKey: string;
  subject: string;
  html: string;
}) {
  if (!SUPPORT_TEMPLATE_KEYS.has(input.templateKey)) {
    return input;
  }

  return {
    templateKey: input.templateKey,
    subject: sanitizeSupportSubject(input.subject),
    html: sanitizeSupportHtml(input.html),
  };
}
