function normalizeValue(value?: string | null) {
  return String(value || '').trim();
}

function isGenericAdminName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;

  return [
    'admin',
    'administrator',
    'administrator fra tinglum gård',
    'administrator fra tinglum gard',
    'tinglum gård',
    'tinglum gard',
    'post',
    'support',
    'noreply',
    'no-reply',
  ].includes(normalized);
}

function toDisplayName(value?: string | null) {
  const trimmed = normalizeValue(value);
  if (!trimmed) return null;

  const firstToken = trimmed.split(/\s+/)[0]?.trim();
  if (!firstToken || isGenericAdminName(firstToken)) {
    return null;
  }

  if (firstToken === firstToken.toLowerCase()) {
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
  }

  return firstToken;
}

function getNameFromEmail(email?: string | null) {
  const normalizedEmail = normalizeValue(email).toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return null;
  }

  const localPart = normalizedEmail.split('@')[0]?.split('+')[0] || '';
  const firstToken = localPart.split(/[._-]+/)[0]?.trim() || '';
  if (!firstToken || isGenericAdminName(firstToken)) {
    return null;
  }

  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
}

export function getCustomerFacingAdminName(input: { name?: string | null; email?: string | null }) {
  const fromName = toDisplayName(input.name);
  if (fromName) {
    return fromName;
  }

  const fromEmail = getNameFromEmail(input.email);
  if (fromEmail) {
    return fromEmail;
  }

  return 'Tinglum Gård';
}
