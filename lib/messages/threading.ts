function resolveMailDomain() {
  const raw =
    process.env.MAILGUN_DOMAIN ||
    process.env.EMAIL_REPLY_TO ||
    process.env.EMAIL_FROM ||
    'tinglumgard.no';

  const trimmed = String(raw).trim();
  if (!trimmed) return 'tinglumgard.no';
  return trimmed.includes('@') ? trimmed.split('@').pop() || 'tinglumgard.no' : trimmed;
}

function sanitizeSegment(value: string, fallback: string) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

export function buildSupportThreadMessageId(threadId: string, label = 'support') {
  const safeThreadId = sanitizeSegment(threadId, 'msg-unknown');
  const safeLabel = sanitizeSegment(label, 'message');
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `<${safeThreadId}.${safeLabel}.${unique}@${resolveMailDomain()}>`;
}

export function extractSupportThreadId(value: string | null | undefined) {
  const raw = String(value || '');
  const match = raw.match(/\b(msg_[a-z0-9-]+)\b/i);
  return match ? match[1] : null;
}

export function normalizeSupportSubject(value: string | null | undefined) {
  let subject = String(value || '').trim();
  if (!subject) return '';

  subject = subject.replace(/^((re|fw|fwd|sv|svar|aw):\s*)+/i, '');
  subject = subject.replace(/^melding fra tinglum g(?:ard|\u00e5rd|ård):\s*/i, '');
  subject = subject.replace(/^message from tinglum gard:\s*/i, '');
  subject = subject.replace(/^\[msg_[^\]]+\]\s*/i, '');

  return subject.trim().toLowerCase();
}

