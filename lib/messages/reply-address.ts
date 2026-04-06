function extractEmailAddress(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const match = raw.match(/<([^>]+)>/);
  const email = (match ? match[1] : raw).trim().toLowerCase();
  return email || null;
}

function extractDomain(value?: string | null) {
  const email = extractEmailAddress(value);
  if (email && email.includes('@')) {
    return email.split('@')[1] || null;
  }

  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes('@')) {
    return raw.split('@')[1] || null;
  }

  return raw;
}

export function getSupportReplyAddress(input?: {
  configuredReplyTo?: string | null;
  configuredFrom?: string | null;
  mailDomain?: string | null;
}) {
  const senderAddress = extractEmailAddress(input?.configuredFrom || process.env.EMAIL_FROM);
  const explicitReplyTo = extractEmailAddress(input?.configuredReplyTo || process.env.EMAIL_REPLY_TO);
  if (explicitReplyTo && explicitReplyTo !== senderAddress) {
    return explicitReplyTo;
  }

  const domain =
    extractDomain(input?.mailDomain || process.env.MAILGUN_DOMAIN) ||
    extractDomain(input?.configuredFrom || process.env.EMAIL_FROM) ||
    'tinglum.com';

  return `messages@${domain}`;
}
