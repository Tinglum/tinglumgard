import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import {
  EggCollectionError,
  applyEggDailyBulkAction,
  bulkUpsertEggDailyCollections,
} from '@/lib/eggs/collection'
import { recomputeForecastForBreed } from '@/lib/eggs/forecast'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()

    if (Array.isArray(body?.rows)) {
      const result = await bulkUpsertEggDailyCollections({
        rows: body.rows,
        session: access.session,
        reason: body?.reason || null,
      })

      const breedDates = new Map<string, string>()
      for (const row of result.rows) {
        if (!breedDates.has(row.breed_id)) {
          breedDates.set(row.breed_id, row.collection_date)
        }
      }

      await Promise.all(
        Array.from(breedDates.entries()).map(([breedId, date]) =>
          recomputeForecastForBreed({ breedId, date })
        )
      )

      return NextResponse.json(result)
    }

    const result = await applyEggDailyBulkAction({
      collectionDate: body?.collection_date,
      breedIds: body?.breed_ids || [],
      action: body?.action,
      value: body?.value,
      reason: body?.reason || null,
      session: access.session,
    })

    const breedIds: string[] = Array.isArray(body?.breed_ids)
      ? body.breed_ids.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)
      : []
    const uniqueBreeds: string[] = Array.from(new Set<string>(breedIds))
    await Promise.all(
      uniqueBreeds.map((breedId: string) =>
        recomputeForecastForBreed({
          breedId,
          date: body?.collection_date,
        })
      )
    )

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof EggCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to apply bulk update' }, { status: 500 })
  }
}
