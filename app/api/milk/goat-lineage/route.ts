import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ApiGoat = {
  id: string
  name: string
  ear_tag?: string | null
  date_of_birth?: string | null
}

async function getLocalActiveGoats(): Promise<ApiGoat[]> {
  const { data } = await supabaseAdmin
    .from('milk_goats')
    .select('id, name, tag_number')
    .eq('status', 'active')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    ear_tag: g.tag_number,
  }))
}

function mergeGoatLists(primary: ApiGoat[], secondary: ApiGoat[]): ApiGoat[] {
  const merged = new Map<string, ApiGoat>()

  for (const goat of secondary) merged.set(goat.id, goat)
  for (const goat of primary) merged.set(goat.id, goat)

  return Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
}

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  // Try goat-lineage project first
  const glUrl = process.env.GOAT_LINEAGE_SUPABASE_URL
  const glKey = process.env.GOAT_LINEAGE_SUPABASE_KEY

  if (glUrl && glKey) {
    try {
      const glClient = createClient(glUrl, glKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      // Get all alive females, then filter client-side
      // (some founders have null dateOfBirth — those are old enough)
      const { data: allGoats, error } = await glClient
        .from('Goat')
        .select('id, name, sex, isAlive, earTag, dateOfBirth')
        .eq('sex', 'FEMALE')
        .eq('isAlive', true)
        .order('name', { ascending: true })

      // Only include goats born 2024 or earlier (or with no DOB — founders)
      // Plus specific 2025 does that are milking: Lorelei, Celine, Trudi
      const EXTRA_2025_IDS = ['lorelei', 'celine', 'trudi']
      const data = (allGoats || []).filter((g: any) => {
        if (!g.dateOfBirth) return true
        if (EXTRA_2025_IDS.includes(g.id)) return true
        return new Date(g.dateOfBirth).getFullYear() <= 2024
      })

      if (!error && data && data.length > 0) {
        // Sync lineage goats into local milk_goats table so FK works
        for (const g of data) {
          await supabaseAdmin
            .from('milk_goats')
            .upsert({
              id: g.id,
              name: g.name,
              tag_number: g.earTag || null,
              status: 'active',
            }, { onConflict: 'id' })
        }

        const localGoats = await getLocalActiveGoats()
        const lineageGoats: ApiGoat[] = data.map((g: any) => ({
          id: g.id,
          name: g.name,
          ear_tag: g.earTag,
          date_of_birth: g.dateOfBirth,
        }))

        return NextResponse.json({
          source: 'goat-lineage+local',
          goats: mergeGoatLists(lineageGoats, localGoats)
        })
      }
    } catch {
      // Fall through to local
    }
  }

  // Fallback: local milk_goats table
  const goats = await getLocalActiveGoats()

  return NextResponse.json({
    source: 'local',
    goats
  })
}
