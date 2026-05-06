import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAgeWeeks, getHenPrice } from '@/lib/chickens/pricing'

export const dynamic = 'force-dynamic'

/**
 * Returns all active hatches with available birds, priced as of today.
 * Used for walk-in / on-farm additions at pickup time — no week filter applied.
 */
export async function GET() {
  try {
    const { data: hatches, error } = await supabaseAdmin
      .from('chicken_hatches')
      .select('*, chicken_breeds(*)')
      .eq('active', true)
      .or('available_hens.gt.0,available_roosters.gt.0')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const today = new Date()

    const result = (hatches || [])
      .map((hatch: any) => {
        const breed = hatch.chicken_breeds
        if (!breed?.active) return null

        const ageWeeks = getAgeWeeks(hatch.hatch_date, today)
        if (ageWeeks < 1) return null

        const pricePerHen = getHenPrice(
          ageWeeks,
          Number(breed.start_price_nok),
          Number(breed.weekly_increase_nok),
          Number(breed.adult_price_nok)
        )

        const breedSlug = String(breed.slug || '').toLowerCase()
        const isCreamLegbar = breedSlug === 'cream-legbar'
        const sexed = isCreamLegbar || ageWeeks >= 10
        const defaultRoosterPrice = breedSlug === 'ayam-cemani' ? 400 : 200
        const pricePerRooster = Number(breed.rooster_price_nok) || defaultRoosterPrice

        return {
          hatchId: hatch.id,
          breedId: breed.id,
          breedName: breed.name,
          breedSlug,
          hatchDate: hatch.hatch_date,
          ageWeeks,
          sexed,
          isCreamLegbar,
          pricePerHen,
          pricePerRooster,
          availableHens: Number(hatch.available_hens || 0),
          availableRoosters: Number(hatch.available_roosters || 0),
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const byBreed = a.breedName.localeCompare(b.breedName, 'nb')
        if (byBreed !== 0) return byBreed
        return a.ageWeeks - b.ageWeeks
      })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
