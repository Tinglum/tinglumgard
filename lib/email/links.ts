function normalizeBaseUrl(appBaseUrl: string): string {
  return String(appBaseUrl || 'https://tinglumgard.no').replace(/\/+$/, '');
}

export function sanitizeReturnToPath(path: string): string {
  const raw = String(path || '').trim();
  if (!raw) return '/';

  // Disallow protocol-relative or absolute URLs.
  if (raw.startsWith('//') || /^https?:\/\//i.test(raw)) {
    return '/';
  }

  if (!raw.startsWith('/')) {
    return `/${raw}`;
  }

  return raw;
}

export function buildVippsLoginLink(appBaseUrl: string, returnToPath: string): string {
  const base = normalizeBaseUrl(appBaseUrl);
  const returnTo = sanitizeReturnToPath(returnToPath);
  return `${base}/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function customerOrderPath(scope: 'pig' | 'egg' | 'chicken', entityId: string): string {
  if (scope === 'egg') return `/rugeegg/mine-bestillinger/${entityId}/betaling`;
  if (scope === 'chicken') return `/min-side?chickenOrderId=${encodeURIComponent(entityId)}`;
  return `/min-side?orderId=${encodeURIComponent(entityId)}`;
}

export function buildCustomerOrderLink(
  appBaseUrl: string,
  scope: 'pig' | 'egg' | 'chicken',
  entityId: string
): string {
  return buildVippsLoginLink(appBaseUrl, customerOrderPath(scope, entityId));
}

export function adminOrderPath(scope: 'pig' | 'egg' | 'chicken', entityId: string): string {
  if (scope === 'egg') return `/admin?tab=egg-orders&orderId=${encodeURIComponent(entityId)}`;
  if (scope === 'chicken') return `/admin?tab=chicken-orders&orderId=${encodeURIComponent(entityId)}`;
  return `/admin?tab=orders&orderId=${encodeURIComponent(entityId)}`;
}

export function buildAdminOrderLink(
  appBaseUrl: string,
  scope: 'pig' | 'egg' | 'chicken',
  entityId: string
): string {
  const base = normalizeBaseUrl(appBaseUrl);
  const deepLinkPath = adminOrderPath(scope, entityId);
  const url = new URL(`${base}/admin`);
  url.searchParams.set('returnTo', deepLinkPath);

  // Keep direct deep-link params on first load for already-authenticated admins.
  const deep = new URL(`${base}${deepLinkPath}`);
  deep.searchParams.forEach((value, key) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export function buildCustomerPathLink(appBaseUrl: string, returnToPath: string): string {
  return buildVippsLoginLink(appBaseUrl, returnToPath);
}
