type MaybePreset = {
  slug?: string | null;
  name_no?: string | null;
  name_en?: string | null;
  target_weight_kg?: number | null;
} | null;

type OrderWithPreset = {
  box_size?: number | string | null;
  mangalitsa_preset?: MaybePreset | MaybePreset[];
  mangalitsa_box_presets?: MaybePreset | MaybePreset[];
};

function parseBoxSize(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const numeric = Number(value.trim());
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return 0;
}

function resolvePreset(order: OrderWithPreset): MaybePreset {
  const primary = order.mangalitsa_preset;
  if (Array.isArray(primary)) return primary[0] || null;
  if (primary) return primary;

  const fallback = order.mangalitsa_box_presets;
  if (Array.isArray(fallback)) return fallback[0] || null;
  return fallback || null;
}

export function getEffectiveBoxSize(order: OrderWithPreset): number {
  const directSize = parseBoxSize(order.box_size);
  if (directSize > 0) return directSize;

  const preset = resolvePreset(order);
  if (typeof preset?.target_weight_kg === 'number' && Number.isFinite(preset.target_weight_kg)) {
    return preset.target_weight_kg;
  }

  return 0;
}

export function getOrderPresetNames(order: OrderWithPreset): { no: string | null; en: string | null } {
  const preset = resolvePreset(order);
  if (preset?.name_no || preset?.name_en) {
    return {
      no: preset?.name_no || null,
      en: preset?.name_en || null,
    };
  }

  // Fallback for standard (non-mangalitsa) orders that only have box_size.
  const boxSize = parseBoxSize(order.box_size);
  if (boxSize > 0) {
    return {
      no: `Kasse ${boxSize} kg`,
      en: `Box ${boxSize} kg`,
    };
  }

  return { no: null, en: null };
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
