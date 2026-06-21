import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { upsertMilkSession, MilkCollectionError } from '@/lib/milk/collection'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const row = await upsertMilkSession({ ...body, id: params.id }, access.session)
    return NextResponse.json({ row })
  } catch (error: any) {
    if (error instanceof MilkCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to update session' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const date = params.id
    // Verify it's a valid date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Delete all sessions for this date
    await supabaseAdmin
      .from('milk_daily_sessions')
      .delete()
      .eq('milking_date', date)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete day' }, { status: 500 })
  }
}
