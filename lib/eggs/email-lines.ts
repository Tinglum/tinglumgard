type EggBreedRelation =
  | {
      name?: string | null;
      name_no?: string | null;
      name_en?: string | null;
    }
  | Array<{
      name?: string | null;
      name_no?: string | null;
      name_en?: string | null;
    }>
  | null;

type EggAdditionLike = {
  quantity?: number | null;
  price_per_egg?: number | null;
  subtotal?: number | null;
  egg_breeds?: EggBreedRelation;
};

type EggOrderLike = {
  quantity?: number | null;
  price_per_egg?: number | null;
  egg_breeds?: EggBreedRelation;
  egg_order_additions?: EggAdditionLike[] | null;
};

export type EggOrderLine = {
  source: 'base' | 'addition';
  breedName: string;
  quantity: number;
  pricePerEggOre: number;
  subtotalOre: number;
};

export type EggOrderSummary = {
  breedLabel: string;
  baseQuantity: number;
  additionsQuantity: number;
  totalQuantity: number;
  subtotalOre: number;
  lines: EggOrderLine[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pickBreedName(relation: EggBreedRelation, locale: 'no' | 'en' = 'no'): string {
  const breed = Array.isArray(relation) ? relation[0] : relation;
  if (locale === 'en') {
    return String(breed?.name_en || breed?.name_no || breed?.name || 'Hatching eggs').trim() || 'Hatching eggs';
  }
  return String(breed?.name_no || breed?.name_en || breed?.name || 'Rugeegg').trim() || 'Rugeegg';
}

function formatOreToNok(amountOre: number): string {
  return `kr ${Math.round((Number(amountOre) || 0) / 100).toLocaleString('nb-NO')}`;
}

export function summarizeEggOrderLines(order: EggOrderLike, locale: 'no' | 'en' = 'no'): EggOrderSummary {
  const lines: EggOrderLine[] = [];

  const baseQuantity = Math.max(0, Math.round(toNumber(order?.quantity)));
  const basePricePerEggOre = Math.max(0, Math.round(toNumber(order?.price_per_egg)));

  if (baseQuantity > 0) {
    lines.push({
      source: 'base',
      breedName: pickBreedName(order?.egg_breeds || null, locale),
      quantity: baseQuantity,
      pricePerEggOre: basePricePerEggOre,
      subtotalOre: baseQuantity * basePricePerEggOre,
    });
  }

  const additions = Array.isArray(order?.egg_order_additions) ? order.egg_order_additions : [];
  for (const addition of additions) {
    const quantity = Math.max(0, Math.round(toNumber(addition?.quantity)));
    if (quantity <= 0) continue;
    const pricePerEggOre = Math.max(0, Math.round(toNumber(addition?.price_per_egg)));
    const subtotalOre = Math.max(0, Math.round(toNumber(addition?.subtotal) || quantity * pricePerEggOre));

    lines.push({
      source: 'addition',
      breedName: pickBreedName(addition?.egg_breeds || null, locale),
      quantity,
      pricePerEggOre,
      subtotalOre,
    });
  }

  const additionsQuantity = lines
    .filter((line) => line.source === 'addition')
    .reduce((sum, line) => sum + line.quantity, 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalOre = lines.reduce((sum, line) => sum + line.subtotalOre, 0);
  const breedLabel = Array.from(new Set(lines.map((line) => line.breedName)))
    .filter(Boolean)
    .join(' + ');

  return {
    breedLabel,
    baseQuantity,
    additionsQuantity,
    totalQuantity,
    subtotalOre,
    lines,
  };
}

export function buildEggOrderLinesHtml(
  lines: EggOrderLine[],
  locale: 'no' | 'en' = 'no',
  options?: { deliveryFeeOre?: number; deliveryLabel?: string }
): string {
  if (!lines.length) {
    return locale === 'en'
      ? '<p>No order lines registered.</p>'
      : '<p>Ingen ordrelinjer registrert.</p>';
  }

  const labels =
    locale === 'en'
      ? {
          source: 'Line',
          breed: 'Breed',
          quantity: 'Quantity',
          unitPrice: 'Price / egg',
          total: 'Total',
          base: 'Base order',
          addition: 'Added line',
          eggUnit: 'eggs',
          deliveryFee: 'Shipping & packing',
        }
      : {
          source: 'Linje',
          breed: 'Rase',
          quantity: 'Antall',
          unitPrice: 'Pris / egg',
          total: 'Total',
          base: 'Grunnordre',
          addition: 'Tillegg',
          eggUnit: 'egg',
          deliveryFee: 'Frakt og pakking',
        };

  const rows = lines
    .map((line) => {
      const sourceLabel = line.source === 'base' ? labels.base : labels.addition;
      return `<tr>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(sourceLabel)}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(line.breedName)}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${line.quantity} ${labels.eggUnit}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${formatOreToNok(
    line.pricePerEggOre
  )}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${formatOreToNok(
    line.subtotalOre
  )}</td>
</tr>`;
    })
    .join('');

  const subtotalOre = lines.reduce((sum, line) => sum + line.subtotalOre, 0);
  const deliveryFeeOre = Math.max(0, Math.round(Number(options?.deliveryFeeOre || 0)));
  const totalOre = subtotalOre + deliveryFeeOre;
  const deliveryFeeRow = deliveryFeeOre > 0
    ? `<tr>
  <td colspan="3" style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${labels.deliveryFee}${options?.deliveryLabel ? ` (${escapeHtml(options.deliveryLabel)})` : ''}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;"></td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${formatOreToNok(deliveryFeeOre)}</td>
</tr>`
    : '';

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:8px 0;">
  <thead>
    <tr style="background:#f9fafb;">
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${labels.source}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${labels.breed}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${labels.quantity}</th>
      <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;">${labels.unitPrice}</th>
      <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;"></th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    ${deliveryFeeRow}
    <tr style="background:#f9fafb;">
      <td colspan="4" style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${labels.total}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatOreToNok(totalOre)}</td>
    </tr>
  </tbody>
</table>`;
}
