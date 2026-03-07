type BreedMinimumInput = {
  slug?: string | null
  minOrderQuantity?: number | null
  min_order_quantity?: number | null
}

function readConfiguredMinimum(input: BreedMinimumInput): number {
  const value = input.minOrderQuantity ?? input.min_order_quantity ?? 0
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
}

export function getSingleBreedMinimumEggs(input: BreedMinimumInput): number {
  const baseline = input.slug === 'ayam-cemani' ? 6 : 10
  const configured = readConfiguredMinimum(input)
  return Math.max(baseline, configured)
}
