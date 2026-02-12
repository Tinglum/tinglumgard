type MaybePreset = {
  slug?: string | null;
  name_no?: string | null;
  name_en?: string | null;
  target_weight_kg?: number | null;
} | null;

type OrderWithPreset = {
  box_size?: number | null;
  mangalitsa_preset?: MaybePreset | MaybePreset[];
  mangalitsa_box_presets?: MaybePreset | MaybePreset[];
};

function resolvePreset(order: OrderWithPreset): MaybePreset {
  const primary = order.mangalitsa_preset;
  if (Array.isArray(primary)) return primary[0] || null;
  if (primary) return primary;

  const fallback = order.mangalitsa_box_presets;
  if (Array.isArray(fallback)) return fallback[0] || null;
  return fallback || null;
}

export function getEffectiveBoxSize(order: OrderWithPreset): number {
  if (typeof order.box_size === 'number' && Number.isFinite(order.box_size)) {
    return order.box_size;
  }

  const preset = resolvePreset(order);
  if (typeof preset?.target_weight_kg === 'number' && Number.isFinite(preset.target_weight_kg)) {
    return preset.target_weight_kg;
  }

  return 0;
}

export function getOrderPresetNames(order: OrderWithPreset): { no: string | null; en: string | null } {
  const preset = resolvePreset(order);
  return {
    no: preset?.name_no || null,
    en: preset?.name_en || null,
  };
}

export function normalizeOrderForDisplay<T extends OrderWithPreset>(order: T): T & {
  effective_box_size: number;
  display_box_name_no: string | null;
  display_box_name_en: string | null;
} {
  const effectiveBoxSize = getEffectiveBoxSize(order);
  const names = getOrderPresetNames(order);

  return {
    ...order,
    box_size: order.box_size ?? (effectiveBoxSize > 0 ? effectiveBoxSize : null),
    effective_box_size: effectiveBoxSize,
    display_box_name_no: names.no,
    display_box_name_en: names.en,
  };
}
