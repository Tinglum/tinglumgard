import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getEggOpsConfig } from '@/lib/eggs/ops-config'

const KEYS = [
  'egg_forecast_window_days',
  'egg_forecast_horizon_weeks',
  'egg_forecast_sync_enabled',
  'egg_forecast_timezone',
  'egg_low_stock_thresholds',
  'egg_ops_default_language',
  'egg_ops_require_auth',
  'egg_ops_ip_allowlist',
  'egg_ops_summary_enabled',
  'egg_ops_summary_recipients',
  'egg_ops_anomaly_drop_threshold_percent',
  'egg_ops_anomaly_spike_threshold_percent',
]

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { requireAdmin: true })
  if (!access.ok) return access.response

  try {
    const config = await getEggOpsConfig()
    return NextResponse.json({ config })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { requireAdmin: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const updates = KEYS
      .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
      .map((key) => ({ key, value: body[key] }))

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No config values provided' }, { status: 400 })
    }

    let { error } = await supabaseAdmin.from('app_config').upsert(updates, { onConflict: 'key' })

    const message = String(error?.message || '').toLowerCase()
    const details = String(error?.details || '').toLowerCase()
    const hint = String(error?.hint || '').toLowerCase()
    const missingDescription =
      message.includes('description') || details.includes('description') || hint.includes('description')

    if (error && missingDescription) {
      const fallback = await supabaseAdmin
        .from('app_config')
        .upsert(updates.map((item) => ({ key: item.key, value: item.value })), { onConflict: 'key' })
      error = fallback.error
    }

    if (error) throw error

    const config = await getEggOpsConfig()
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update config' }, { status: 500 })
  }
}
