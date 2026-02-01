/**
 * Box size configuration constants
 * Used throughout the application for order management, pricing, and inventory
 */

export const BOX_SIZES = {
  SMALL: 8,  // kg
  LARGE: 12, // kg
} as const;

export const BOX_SIZE_LABELS = {
  [BOX_SIZES.SMALL]: '8 kg',
  [BOX_SIZES.LARGE]: '12 kg',
} as const;

export const BOX_SIZE_NAMES = {
  [BOX_SIZES.SMALL]: 'Small',
  [BOX_SIZES.LARGE]: 'Large',
} as const;

// Type for box size values
export type BoxSize = typeof BOX_SIZES[keyof typeof BOX_SIZES];

// All available box sizes as array
export const ALL_BOX_SIZES = Object.values(BOX_SIZES) as BoxSize[];
