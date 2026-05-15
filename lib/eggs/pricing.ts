/**
 * Calculate effective price per egg for a customer based on days until delivery.
 * If inventory has an early_bird_discount_pct and daysUntilDelivery > early_bird_cutoff_days,
 * the discount applies.
 */
export function getEggPrice(params: {
  basePriceOre: number;
  earlyBirdDiscountPct: number;
  earlyBirdCutoffDays: number;
  daysUntilDelivery: number;
}): number {
  const { basePriceOre, earlyBirdDiscountPct, earlyBirdCutoffDays, daysUntilDelivery } = params;
  if (earlyBirdDiscountPct > 0 && daysUntilDelivery > earlyBirdCutoffDays) {
    return Math.round(basePriceOre * (1 - earlyBirdDiscountPct / 100));
  }
  return basePriceOre;
}
