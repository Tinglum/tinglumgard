import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
      const { data, error } = await glClient
        .from('Goat')
        .select('id, name, sex, isAlive, earTag, dateOfBirth')
        .eq('sex', 'FEMALE')
        .eq('isAlive', true)
        .order('name', { ascending: true })

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

        return NextResponse.json({
          source: 'goat-lineage',
          goats: data.map((g: any) => ({
            id: g.id,
            name: g.name,
            ear_tag: g.earTag,
            date_of_birth: g.dateOfBirth,
          }))
        })
      }
    } catch {
      // Fall through to local
    }
  }

  // Fallback: local milk_goats table
  const { data } = await supabaseAdmin
    .from('milk_goats')
    .select('id, name, tag_number')
    .eq('status', 'active')
    .order('display_order', { ascending: true })

  return NextResponse.json({
    source: 'local',
    goats: (data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      ear_tag: g.tag_number,
    }))
  })
}
