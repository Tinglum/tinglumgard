/**
 * Shared application constants.
 * Import from here rather than scattering magic strings across the codebase.
 */

/** Sentinel email assigned to egg/chicken orders before Vipps auth completes. */
export const VIPPS_PENDING_EMAIL = 'pending@vipps.no';

/** Session cookie name — must match everywhere a cookie is set or read. */
export const SESSION_COOKIE_NAME = 'tinglum_session';

/** Cookie options used every time the session cookie is written. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
} as const;

/** Canonical public URL for the app. */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';

/** Discount applied when fulfilling wishlist additions (percent). */
export const WISHLIST_DISCOUNT_PCT = 30;

/** Hours a pending (unpaid) egg order is kept before being released. */
export const PENDING_ORDER_EXPIRY_HOURS = 6;
