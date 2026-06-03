import { supabaseAdmin } from '@/lib/supabase/server'

const DEFAULT_REQUIRE_AUTH = false
const DEFAULT_IP_ALLOWLIST: string[] = []
const DEFAULT_BOTTLE_SIZE_ML = 1000
const DEFAULT_PASTEURIZE_TEMP = 72
const DEFAULT_PASTEURIZE_MINUTES = 15
const DEFAULT_AGING_ALERT_DAYS = 7

export interface MilkOpsConfig {
  requireAuth: boolean
  ipAllowlist: string[]
  defaultBottleSizeMl: number
  pasteurizeDefaultTemp: number
  pasteurizeDefaultMinutes: number
  agingAlertDaysBefore: number
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase()
    if (n === 'true') return true
    if (n === 'false') return false
  }
  return fallback
}

function asInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value.map((i) => (typeof i === 'string' ? i.trim() : '')).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {}
    return value.split(',').map((i) => i.trim()).filter(Boolean)
  }
  return fallback
}

export async function getMilkOpsConfig(): Promise<MilkOpsConfig> {
  const keys = [
    'milk_ops_require_auth',
    'milk_ops_ip_allowlist',
    'milk_default_bottle_size_ml',
    'milk_pasteurize_default_temp',
    'milk_pasteurize_default_minutes',
    'milk_aging_alert_days_before',
  ]

  const { data } = await supabaseAdmin
    .from('app_config')
    .select('key, value')
    .in('key', keys)

  const map = new Map((data || []).map((row) => [row.key, row.value]))

  return {
    requireAuth: asBool(map.get('milk_ops_require_auth'), DEFAULT_REQUIRE_AUTH),
    ipAllowlist: asStringArray(map.get('milk_ops_ip_allowlist'), DEFAULT_IP_ALLOWLIST),
    defaultBottleSizeMl: asInt(map.get('milk_default_bottle_size_ml'), DEFAULT_BOTTLE_SIZE_ML),
    pasteurizeDefaultTemp: asInt(map.get('milk_pasteurize_default_temp'), DEFAULT_PASTEURIZE_TEMP),
    pasteurizeDefaultMinutes: asInt(map.get('milk_pasteurize_default_minutes'), DEFAULT_PASTEURIZE_MINUTES),
    agingAlertDaysBefore: asInt(map.get('milk_aging_alert_days_before'), DEFAULT_AGING_ALERT_DAYS),
  }
}
