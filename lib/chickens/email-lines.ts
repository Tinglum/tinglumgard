type ChickenBreedRelation =
  | { name?: string | null; name_no?: string | null; name_en?: string | null }
  | Array<{ name?: string | null; name_no?: string | null; name_en?: string | null }>
  | null;

type ChickenAdditionLike = {
  hatch_id?: string | null;
  age_weeks_at_pickup?: number | null;
  chicken_hatches?: { hatch_date?: string | null } | null;
  quantity_hens?: number | null;
  quantity_roosters?: number | null;
  price_per_hen_nok?: number | null;
  price_per_rooster_nok?: number | null;
  subtotal_nok?: number | null;
  chicken_breeds?: ChickenBreedRelation;
};

type ChickenOrderLike = {
  hatch_id?: string | null;
  pickup_monday?: string | null;
  age_weeks_at_pickup?: number | null;
  chicken_hatches?: { hatch_date?: string | null } | null;
  quantity_hens?: number | null;
  quantity_roosters?: number | null;
  price_per_hen_nok?: number | null;
  price_per_rooster_nok?: number | null;
  chicken_breeds?: ChickenBreedRelation;
  chicken_order_additions?: ChickenAdditionLike[] | null;
};

export type ChickenOrderLine = {
  source: 'base' | 'addition';
  breedName: string;
  hens: number;
  roosters: number;
  ageWeeksAtPickup: number | null;
  pricePerHenNok: number;
  pricePerRoosterNok: number;
  subtotalNok: number;
};

export type ChickenOrderSummary = {
  breedLabel: string;
  hens: number;
  roosters: number;
  subtotalNok: number;
  lines: ChickenOrderLine[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getAgeWeeks(hatchDate?: string | null, pickupDate?: Date | null): number {
  const hatch = toDateOnly(hatchDate || null);
  if (!hatch || !pickupDate) return 0;
  const diffMs = pickupDate.getTime() - hatch.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function resolveLineAgeWeeks(
  explicitAge: unknown,
  hatchDate: string | null | undefined,
  pickupDate: Date | null
): number | null {
  const parsedAge = Math.round(toNumber(explicitAge));
  if (parsedAge > 0) return parsedAge;
  const computedAge = getAgeWeeks(hatchDate, pickupDate);
  return computedAge > 0 ? computedAge : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pickBreedName(relation: ChickenBreedRelation): string {
  const breed = Array.isArray(relation) ? relation[0] : relation;
  return String(breed?.name_no || breed?.name_en || breed?.name || 'Kyllinger').trim() || 'Kyllinger';
}

function formatNok(amount: number, locale: 'no' | 'en'): string {
  const language = locale === 'en' ? 'en-US' : 'nb-NO';
  return `kr ${Math.round(amount).toLocaleString(language)}`;
}

function buildQuantityText(line: ChickenOrderLine, locale: 'no' | 'en'): string {
  if (locale === 'en') {
    if (line.roosters > 0) return `${line.hens} chickens, ${line.roosters} roosters`;
    return `${line.hens} chickens`;
  }
  if (line.roosters > 0) return `${line.hens} kyllinger, ${line.roosters} haner`;
  return `${line.hens} kyllinger`;
}

function buildUnitPriceText(line: ChickenOrderLine, locale: 'no' | 'en'): string {
  if (line.roosters > 0 && line.pricePerRoosterNok > 0) {
    if (locale === 'en') {
      return `Chicken ${formatNok(line.pricePerHenNok, locale)} / Rooster ${formatNok(line.pricePerRoosterNok, locale)}`;
    }
    return `Kylling ${formatNok(line.pricePerHenNok, locale)} / Hane ${formatNok(line.pricePerRoosterNok, locale)}`;
  }
  if (locale === 'en') return `Chicken ${formatNok(line.pricePerHenNok, locale)}`;
  return `Kylling ${formatNok(line.pricePerHenNok, locale)}`;
}

export function summarizeChickenOrderLines(order: ChickenOrderLike): ChickenOrderSummary {
  const lines: ChickenOrderLine[] = [];
  const pickupDate = toDateOnly(order?.pickup_monday || null);

  const baseHens = Math.max(0, Math.round(toNumber(order?.quantity_hens)));
  const baseRoosters = Math.max(0, Math.round(toNumber(order?.quantity_roosters)));
  const basePricePerHen = Math.max(0, toNumber(order?.price_per_hen_nok));
  const basePricePerRooster = Math.max(0, toNumber(order?.price_per_rooster_nok));
  const baseSubtotal = baseHens * basePricePerHen + baseRoosters * basePricePerRooster;

  if (baseHens > 0 || baseRoosters > 0) {
    lines.push({
      source: 'base',
      breedName: pickBreedName(order?.chicken_breeds || null),
      hens: baseHens,
      roosters: baseRoosters,
      ageWeeksAtPickup: resolveLineAgeWeeks(
        order?.age_weeks_at_pickup,
        order?.chicken_hatches?.hatch_date || null,
        pickupDate
      ),
      pricePerHenNok: basePricePerHen,
      pricePerRoosterNok: basePricePerRooster,
      subtotalNok: baseSubtotal,
    });
  }

  const additions = Array.isArray(order?.chicken_order_additions) ? order.chicken_order_additions : [];
  for (const addition of additions) {
    const hens = Math.max(0, Math.round(toNumber(addition?.quantity_hens)));
    const roosters = Math.max(0, Math.round(toNumber(addition?.quantity_roosters)));
    if (hens === 0 && roosters === 0) continue;

    const pricePerHen = Math.max(0, toNumber(addition?.price_per_hen_nok) || basePricePerHen);
    const pricePerRooster = Math.max(0, toNumber(addition?.price_per_rooster_nok) || basePricePerRooster);
    const computedSubtotal = hens * pricePerHen + roosters * pricePerRooster;
    const explicitSubtotal = Math.max(0, toNumber(addition?.subtotal_nok));

    lines.push({
      source: 'addition',
      breedName: pickBreedName(addition?.chicken_breeds || null),
      hens,
      roosters,
      ageWeeksAtPickup: resolveLineAgeWeeks(
        addition?.age_weeks_at_pickup,
        addition?.chicken_hatches?.hatch_date || null,
        pickupDate
      ),
      pricePerHenNok: pricePerHen,
      pricePerRoosterNok: pricePerRooster,
      subtotalNok: explicitSubtotal > 0 ? explicitSubtotal : computedSubtotal,
    });
  }

  const hens = lines.reduce((sum, line) => sum + line.hens, 0);
  const roosters = lines.reduce((sum, line) => sum + line.roosters, 0);
  const subtotalNok = lines.reduce((sum, line) => sum + line.subtotalNok, 0);
  const breedLabel = Array.from(new Set(lines.map((line) => line.breedName)))
    .filter(Boolean)
    .join(' + ');

  return {
    breedLabel,
    hens,
    roosters,
    subtotalNok,
    lines,
  };
}

export function buildChickenOrderLinesHtml(
  lines: ChickenOrderLine[],
  locale: 'no' | 'en' = 'no',
  options?: { deliveryFeeNok?: number; deliveryLabel?: string }
): string {
  if (!lines.length) {
    return locale === 'en'
      ? '<p>No order lines registered.</p>'
      : '<p>Ingen ordrelinjer registrert.</p>';
  }

  const headerSource = locale === 'en' ? 'Type' : 'Linje';
  const headerBreed = locale === 'en' ? 'Breed' : 'Rase';
  const headerQuantity = locale === 'en' ? 'Quantity' : 'Antall';
  const headerAge = locale === 'en' ? 'Age' : 'Alder';
  const headerUnitPrice = locale === 'en' ? 'Unit price' : 'Enhetspris';
  const headerSubtotal = '';
  const totalLabel = locale === 'en' ? 'Total' : 'Total';

  const rows = lines
    .map((line) => {
      const sourceLabel =
        locale === 'en'
          ? line.source === 'base'
            ? 'Base order'
            : 'Added line'
          : line.source === 'base'
            ? 'Grunnordre'
            : 'Tillegg';

      const ageText =
        line.ageWeeksAtPickup === null
          ? '&ndash;'
          : escapeHtml(locale === 'en' ? `${line.ageWeeksAtPickup} weeks` : `${line.ageWeeksAtPickup} uker`);

      return `<tr>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(sourceLabel)}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(line.breedName)}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(buildQuantityText(line, locale))}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${ageText}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(buildUnitPriceText(line, locale))}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${escapeHtml(
    formatNok(line.subtotalNok, locale)
  )}</td>
</tr>`;
    })
    .join('');

  const subtotal = lines.reduce((sum, line) => sum + line.subtotalNok, 0);
  const deliveryFeeNok = Math.max(0, Math.round(Number(options?.deliveryFeeNok || 0)));
  const total = subtotal + deliveryFeeNok;

  const deliveryFeeLabel = locale === 'en' ? 'Shipping & packing' : 'Frakt og pakking';
  const deliveryFeeRow = deliveryFeeNok > 0
    ? `<tr>
  <td colspan="4" style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${deliveryFeeLabel}${options?.deliveryLabel ? ` (${escapeHtml(options.deliveryLabel)})` : ''}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;"></td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${escapeHtml(formatNok(deliveryFeeNok, locale))}</td>
</tr>`
    : '';

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:8px 0;">
  <thead>
    <tr style="background:#f9fafb;">
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${headerSource}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${headerBreed}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${headerQuantity}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${headerAge}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${headerUnitPrice}</th>
      <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;">${headerSubtotal}</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    ${deliveryFeeRow}
    <tr style="background:#f9fafb;">
      <td colspan="5" style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${totalLabel}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(
        formatNok(total, locale)
      )}</td>
    </tr>
  </tbody>
</table>`;
}

export function buildTotalBirdsLabel(hens: number, roosters: number, locale: 'no' | 'en' = 'no'): string {
  if (locale === 'en') {
    return `${hens} hens, ${roosters} roosters`;
  }
  return `${hens} høner, ${roosters} haner`;
}

export function buildChickenBreedAgeLabel(
  lines: ChickenOrderLine[],
  locale: 'no' | 'en' = 'no'
): string {
  if (!lines.length) return locale === 'en' ? 'Chickens' : 'Kyllinger';

  const byBreed = new Map<string, Set<number>>();
  for (const line of lines) {
    const breed = String(line.breedName || '').trim();
    if (!breed) continue;
    if (!byBreed.has(breed)) byBreed.set(breed, new Set<number>());
    if (line.ageWeeksAtPickup !== null && line.ageWeeksAtPickup > 0) {
      byBreed.get(breed)!.add(line.ageWeeksAtPickup);
    }
  }

  return Array.from(byBreed.entries())
    .map(([breed, ages]) => {
      if (!ages.size) return breed;
      const sorted = Array.from(ages).sort((a, b) => a - b);
      const ageText =
        sorted.length === 1
          ? `${sorted[0]} ${locale === 'en' ? 'weeks' : 'uker'}`
          : `${sorted[0]}-${sorted[sorted.length - 1]} ${locale === 'en' ? 'weeks' : 'uker'}`;
      return `${breed} (${ageText})`;
    })
    .join(' + ');
}
