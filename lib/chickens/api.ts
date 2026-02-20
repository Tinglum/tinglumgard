import { ChickenBreed, ChickenHatch, ChickenWeekAvailability } from './types'
import { getAgeWeeks, getHenPrice, getEstimatedSurvivors, getISOWeekNumber, getMondayOfWeek } from './pricing'

/** Map a DB breed row to ChickenBreed interface */
export function mapBreed(row: any): ChickenBreed {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accentColor: row.accent_color,
    descriptionNo: row.description_no,
    descriptionEn: row.description_en,
    imageUrl: row.image_url || '',
    startPriceNok: Number(row.start_price_nok),
    weeklyIncreaseNok: Number(row.weekly_increase_nok),
    adultPriceNok: Number(row.adult_price_nok),
    roosterPriceNok: Number(row.rooster_price_nok),
    sellRoosters: row.sell_roosters,
    mortalityRateEarlyPct: Number(row.mortality_rate_early_pct),
    mortalityRateLatePct: Number(row.mortality_rate_late_pct),
    isActive: row.active,
    displayOrder: row.display_order,
  }
}

/** Map a DB hatch row (with optional breed join) to ChickenHatch interface */
export function mapHatch(row: any): ChickenHatch {
  const breed = row.chicken_breeds || {}
  return {
    id: row.id,
    breedId: row.breed_id,
    breedName: breed.name || undefined,
    breedSlug: breed.slug || undefined,
    breedAccentColor: breed.accent_color || undefined,
    hatchDate: row.hatch_date,
    initialCount: row.initial_count,
    estimatedHens: row.estimated_hens,
    estimatedRoosters: row.estimated_roosters,
    availableHens: row.available_hens,
    availableRoosters: row.available_roosters,
    mortalityOverride: row.mortality_override != null ? Number(row.mortality_override) : null,
    notes: row.notes || '',
    isActive: row.active,
  }
}

/**
 * Build availability calendar for the next N weeks.
 * For each week, for each active hatch, compute age, price, and available count.
 */
export function buildAvailabilityCalendar(
  breeds: any[],
  hatches: any[],
  weeksAhead: number = 16
): ChickenWeekAvailability[] {
  const now = new Date()
  const currentWeek = getISOWeekNumber(now)
  const currentYear = now.getFullYear()

  const breedMap = new Map<string, any>()
  for (const breed of breeds) {
    breedMap.set(breed.id, breed)
  }

  const calendar: ChickenWeekAvailability[] = []

  for (let offset = 1; offset <= weeksAhead; offset++) {
    // Calculate target week/year
    let targetWeek = currentWeek + offset
    let targetYear = currentYear
    // Handle year overflow (simplified — assumes ~52 weeks/year)
    while (targetWeek > 52) {
      targetWeek -= 52
      targetYear++
    }

    const pickupMonday = getMondayOfWeek(targetYear, targetWeek)

    const breedAvailabilities: ChickenWeekAvailability['breeds'] = []

    // Group hatches by breed
    const hatchesByBreed = new Map<string, any[]>()
    for (const hatch of hatches) {
      if (!hatch.active) continue
      const list = hatchesByBreed.get(hatch.breed_id) || []
      list.push(hatch)
      hatchesByBreed.set(hatch.breed_id, list)
    }

    for (const breed of breeds) {
      if (!breed.active) continue
      const breedHatches = hatchesByBreed.get(breed.id) || []

      const hatchEntries: ChickenWeekAvailability['breeds'][0]['hatches'] = []

      for (const hatch of breedHatches) {
        const ageWeeks = getAgeWeeks(hatch.hatch_date, pickupMonday)
        if (ageWeeks < 0) continue // Not hatched yet at this pickup week

        const pricePerHen = getHenPrice(
          ageWeeks,
          Number(breed.start_price_nok),
          Number(breed.weekly_increase_nok),
          Number(breed.adult_price_nok)
        )

        const estimatedSurvivors = getEstimatedSurvivors(
          hatch.initial_count,
          ageWeeks,
          Number(breed.mortality_rate_early_pct),
          Number(breed.mortality_rate_late_pct)
        )

        // Available = min(db available_hens, estimated survivors)
        const availableHens = Math.min(hatch.available_hens, estimatedSurvivors)

        if (availableHens > 0) {
          hatchEntries.push({
            hatchId: hatch.id,
            ageWeeks,
            pricePerHen,
            availableHens,
            estimatedSurvivors,
          })
        }
      }

      if (hatchEntries.length > 0) {
        const totalAvailable = hatchEntries.reduce((sum, h) => sum + h.availableHens, 0)
        const prices = hatchEntries.map((h) => h.pricePerHen)

        breedAvailabilities.push({
          breedId: breed.id,
          breedName: breed.name,
          breedSlug: breed.slug,
          accentColor: breed.accent_color,
          hatches: hatchEntries,
          totalAvailable,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
        })
      }
    }

    calendar.push({
      weekNumber: targetWeek,
      year: targetYear,
      pickupMonday: pickupMonday.toISOString().split('T')[0],
      breeds: breedAvailabilities,
    })
  }

  return calendar
}
