import { supabaseAdmin } from '@/lib/supabase/server'

const DEFAULT_FORECAST_WINDOW_DAYS = 14
const DEFAULT_FORECAST_HORIZON_WEEKS = 4
const DEFAULT_FORECAST_SYNC_ENABLED = true
const DEFAULT_FORECAST_TIMEZONE = 'Europe/Oslo'
const DEFAULT_LANG = 'no'
const DEFAULT_LOW_STOCK_THRESHOLD = 24
const DEFAULT_REQUIRE_AUTH = false
const DEFAULT_IP_ALLOWLIST: string[] = []
const DEFAULT_SUMMARY_ENABLED = false
const DEFAULT_SUMMARY_RECIPIENTS: string[] = []
const DEFAULT_ANOMALY_DROP_THRESHOLD_PERCENT = 25
const DEFAULT_ANOMALY_SPIKE_THRESHOLD_PERCENT = 25

type JsonMap = Record<string, unknown>

export interface EggOpsConfig {
  forecastWindowDays: number
  forecastHorizonWeeks: number
  forecastSyncEnabled: boolean
  timezone: string
  defaultLanguage: 'no' | 'en'
  lowStockThresholds: JsonMap
  requireAuth: boolean
  ipAllowlist: string[]
  summaryEnabled: boolean
  summaryRecipients: string[]
  anomalyDropThresholdPercent: number
  anomalySpikeThresholdPercent: number
}

function asInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return fallback
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return fallback
}

function asObject(value: unknown): JsonMap {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonMap
  }
  return {}
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return fallback
}

export async function getEggOpsConfig(): Promise<EggOpsConfig> {
  const keys = [
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

  const { data } = await supabaseAdmin
    .from('app_config')
    .select('key, value')
    .in('key', keys)

  const map = new Map((data || []).map((row) => [row.key, row.value]))
  const languageRaw = asString(map.get('egg_ops_default_language'), DEFAULT_LANG)

  return {
    forecastWindowDays: Math.max(3, asInt(map.get('egg_forecast_window_days'), DEFAULT_FORECAST_WINDOW_DAYS)),
    forecastHorizonWeeks: Math.max(1, asInt(map.get('egg_forecast_horizon_weeks'), DEFAULT_FORECAST_HORIZON_WEEKS)),
    forecastSyncEnabled: asBool(map.get('egg_forecast_sync_enabled'), DEFAULT_FORECAST_SYNC_ENABLED),
    timezone: asString(map.get('egg_forecast_timezone'), DEFAULT_FORECAST_TIMEZONE),
    lowStockThresholds: asObject(map.get('egg_low_stock_thresholds')),
    defaultLanguage: languageRaw === 'en' ? 'en' : 'no',
    requireAuth: asBool(map.get('egg_ops_require_auth'), DEFAULT_REQUIRE_AUTH),
    ipAllowlist: asStringArray(map.get('egg_ops_ip_allowlist'), DEFAULT_IP_ALLOWLIST),
    summaryEnabled: asBool(map.get('egg_ops_summary_enabled'), DEFAULT_SUMMARY_ENABLED),
    summaryRecipients: asStringArray(map.get('egg_ops_summary_recipients'), DEFAULT_SUMMARY_RECIPIENTS),
    anomalyDropThresholdPercent: Math.max(
      1,
      asInt(map.get('egg_ops_anomaly_drop_threshold_percent'), DEFAULT_ANOMALY_DROP_THRESHOLD_PERCENT)
    ),
    anomalySpikeThresholdPercent: Math.max(
      1,
      asInt(map.get('egg_ops_anomaly_spike_threshold_percent'), DEFAULT_ANOMALY_SPIKE_THRESHOLD_PERCENT)
    ),
  }
}

export function getLowStockThresholdForBreed(
  breedId: string,
  breedSlug: string | null | undefined,
  config: EggOpsConfig
): number {
  const byId = config.lowStockThresholds[breedId]
  if (typeof byId === 'number' && Number.isFinite(byId)) {
    return Math.max(0, Math.round(byId))
  }

  if (breedSlug) {
    const bySlug = config.lowStockThresholds[breedSlug]
    if (typeof bySlug === 'number' && Number.isFinite(bySlug)) {
      return Math.max(0, Math.round(bySlug))
    }
  }

  const global = config.lowStockThresholds.default
  if (typeof global === 'number' && Number.isFinite(global)) {
    return Math.max(0, Math.round(global))
  }

  return DEFAULT_LOW_STOCK_THRESHOLD
}
