/**
 * Application-wide constants
 */

/** Total number of pork boxes available per season */
export const TOTAL_BOXES = 50;

/** Placeholder email used for Vipps orders before contact details are confirmed */
export const VIPPS_PENDING_EMAIL = 'pending@vipps.no';

/** Admin notification email — falls back to post@tinglum.com if not set via env */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'post@tinglum.com';

// ─── Pig delivery labels ───
export const DELIVERY_LABEL_PICKUP_FARM = 'Henting på gården';
export const DELIVERY_LABEL_PICKUP_E6 = 'Henting ved E6';
export const DELIVERY_LABEL_DELIVERY_TRONDHEIM = 'Levering i Trondheim';
export const DELIVERY_LABEL_DEFAULT_PIG = 'Henting';

// ─── Egg delivery labels ───
export const DELIVERY_LABEL_POSTEN = 'Posten';
export const DELIVERY_LABEL_E6_PICKUP = 'E6 møtepunkt';
export const DELIVERY_LABEL_FARM_PICKUP = 'Henting på gården';
export const DELIVERY_LABEL_DEFAULT_EGG = 'Levering';

// ─── Chicken delivery labels ───
export const DELIVERY_LABEL_CHICKEN_FARM_PICKUP = 'Henting på gården';
export const DELIVERY_LABEL_CHICKEN_DELIVERY_NAMSOS = 'Levering Namsos/Trondheim';
export const DELIVERY_LABEL_DEFAULT_CHICKEN = 'Henting';
