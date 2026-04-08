type AttentionReply = {
  is_from_customer?: boolean | null;
  is_internal?: boolean | null;
  created_at?: string | null;
};

type AttentionMessage = {
  status?: string | null;
  initiated_by?: string | null;
  created_at?: string | null;
  message_replies?: AttentionReply[] | null;
};

function toTimestamp(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function maxTimestamp(current: number | null, candidate: number | null) {
  if (candidate === null) return current;
  if (current === null) return candidate;
  return Math.max(current, candidate);
}

export function getLatestCustomerActivityAt(message: AttentionMessage) {
  let latest: number | null = null;

  if (message.initiated_by !== 'admin') {
    latest = maxTimestamp(latest, toTimestamp(message.created_at));
  }

  for (const reply of message.message_replies || []) {
    if (!reply?.is_from_customer) continue;
    latest = maxTimestamp(latest, toTimestamp(reply.created_at));
  }

  return latest;
}

export function getLatestAdminActivityAt(message: AttentionMessage) {
  let latest: number | null = null;

  if (message.initiated_by === 'admin') {
    latest = maxTimestamp(latest, toTimestamp(message.created_at));
  }

  for (const reply of message.message_replies || []) {
    if (reply?.is_from_customer) continue;
    latest = maxTimestamp(latest, toTimestamp(reply?.created_at));
  }

  return latest;
}

export function needsAdminAttention(message: AttentionMessage) {
  const isUnresolved = message.status === 'open' || message.status === 'in_progress';
  if (!isUnresolved) return false;

  const latestCustomerActivity = getLatestCustomerActivityAt(message);
  if (latestCustomerActivity === null) return false;

  const latestAdminActivity = getLatestAdminActivityAt(message);
  if (latestAdminActivity === null) return true;

  return latestCustomerActivity > latestAdminActivity;
}
