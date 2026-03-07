export type ExtraQuantityShape = {
  slug?: string | null;
  default_quantity?: number | null;
  pricing_type?: string | null;
  fixed_quantity?: number | null;
};

const FIXED_EXTRA_QUANTITY_BY_SLUG: Record<string, number> = {
  spekeskinke: 8,
  'extra-skinke-speking': 8,
};

export function getFixedExtraQuantityForSlug(slug?: string | null): number | null {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return null;
  const fixed = FIXED_EXTRA_QUANTITY_BY_SLUG[normalized];
  return Number.isFinite(fixed) && fixed > 0 ? fixed : null;
}

export function getFixedExtraQuantity(extra?: ExtraQuantityShape | null): number | null {
  if (!extra) return null;
  const explicit = Number(extra.fixed_quantity);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return getFixedExtraQuantityForSlug(extra.slug);
}

export function getExtraStep(pricingType?: string | null): number {
  return pricingType === 'per_kg' ? 0.5 : 1;
}

export function getDefaultExtraQuantity(extra?: ExtraQuantityShape | null): number {
  if (!extra) return 1;
  const fixed = getFixedExtraQuantity(extra);
  if (fixed !== null) return fixed;

  const parsedDefault = Number(extra.default_quantity);
  if (Number.isFinite(parsedDefault) && parsedDefault > 0) {
    return parsedDefault;
  }

  return getExtraStep(extra.pricing_type);
}

export function normalizeExtraQuantity(
  extra: ExtraQuantityShape | null | undefined,
  quantity: number
): number {
  const fixed = getFixedExtraQuantity(extra);
  if (fixed !== null) return fixed;
  return quantity;
}
