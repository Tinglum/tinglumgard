/**
 * Typed API response envelope for future use.
 * Existing routes do not need to be migrated — use this for new routes.
 */
export type ApiResponse<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
