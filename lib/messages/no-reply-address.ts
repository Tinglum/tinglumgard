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

export function getNoReplyAddress(input?: {
  configuredNoReply?: string | null;
  configuredFrom?: string | null;
  mailDomain?: string | null;
}) {
  const explicitNoReply =
    extractEmailAddress(input?.configuredNoReply || process.env.EMAIL_NO_REPLY_TO || process.env.NO_REPLY_EMAIL) ||
    null;
  if (explicitNoReply) {
    return explicitNoReply;
  }

  const domain =
    extractDomain(input?.configuredFrom || process.env.EMAIL_FROM) ||
    extractDomain(input?.mailDomain || process.env.MAILGUN_DOMAIN) ||
    'tinglum.com';

  return `no-reply@${domain}`;
}
