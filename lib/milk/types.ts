// ─── Goats ──────────────────────────────────────────────────────────────────

export type GoatStatus = 'active' | 'dry' | 'pregnant' | 'retired' | 'sold'

export interface MilkGoat {
  id: string
  name: string
  tag_number: string | null
  breed: string | null
  status: GoatStatus
  accent_color: string
  display_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Daily milking ──────────────────────────────────────────────────────────

export type SessionType = 'morning' | 'evening' | 'extra'

export interface MilkDailySession {
  id: string
  milking_date: string
  session_type: SessionType
  total_liters: number
  temperature_celsius: number | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type HealthFlag = 'normal' | 'mastitis_suspect' | 'colostrum' | 'blood_traces' | 'off_smell' | 'other'

export interface MilkSessionEntry {
  id: string
  session_id: string
  goat_id: string
  liters: number
  health_flag: HealthFlag
  health_notes: string | null
  created_at: string
  updated_at: string
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

export type PipelineStatus = 'raw' | 'pasteurizing' | 'pasteurized' | 'bottling' | 'bottled' | 'fridged' | 'allocated' | 'discarded'

export const PIPELINE_ORDER: PipelineStatus[] = ['raw', 'pasteurizing', 'pasteurized', 'bottling', 'bottled', 'fridged']

export const PIPELINE_NEXT: Record<PipelineStatus, PipelineStatus | null> = {
  raw: 'pasteurizing',
  pasteurizing: 'pasteurized',
  pasteurized: 'bottling',
  bottling: 'bottled',
  bottled: 'fridged',
  fridged: 'allocated',
  allocated: null,
  discarded: null,
}

export interface MilkBatch {
  id: string
  batch_code: string
  source_date: string
  source_session_ids: string[]
  liters_raw: number
  liters_remaining: number
  pipeline_status: PipelineStatus
  pasteurized_at: string | null
  pasteurize_temp: number | null
  pasteurize_minutes: number | null
  bottled_at: string | null
  bottle_count: number | null
  bottle_size_ml: number | null
  fridged_at: string | null
  discarded_at: string | null
  discard_reason: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// ─── Recipes ────────────────────────────────────────────────────────────────

export type ProductType = 'cheese' | 'yoghurt' | 'butter' | 'cream' | 'kefir' | 'skyr' | 'other'
export type Difficulty = 'easy' | 'medium' | 'advanced'

export interface RecipeIngredient {
  name: string
  amount: number
  unit: string
  notes?: string
}

export interface RecipeStep {
  order: number
  title: string
  description: string
  duration_minutes?: number
  target_temp?: number
  target_ph?: number
}

export interface DairyRecipe {
  id: string
  name: string
  slug: string
  product_type: ProductType
  version: number
  parent_recipe_id: string | null
  description: string | null
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  aging_min_days: number | null
  aging_max_days: number | null
  aging_temp_celsius: number | null
  aging_humidity_pct: number | null
  difficulty: Difficulty
  expected_yield_pct: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// ─── Production ─────────────────────────────────────────────────────────────

export type ProductionStatus = 'in_progress' | 'aging' | 'ready' | 'consumed' | 'sold' | 'discarded'

export interface ProcessLogEntry {
  timestamp: string
  step: string
  temp?: number
  ph?: number
  humidity?: number
  notes?: string
}

export interface DairyProductionBatch {
  id: string
  batch_code: string
  recipe_id: string | null
  product_type: ProductType
  status: ProductionStatus
  milk_batch_ids: string[]
  milk_liters_used: number
  started_at: string
  completed_at: string | null
  process_log: ProcessLogEntry[]
  yield_kg: number | null
  yield_percentage: number | null
  aging_location: string | null
  aging_start: string | null
  aging_target_date: string | null
  aging_temp: number | null
  aging_humidity: number | null
  quality_score: number | null
  tasting_notes: string | null
  consumed_at: string | null
  consumed_notes: string | null
  sold_at: string | null
  sold_price_nok: number | null
  sold_to: string | null
  discarded_at: string | null
  discard_reason: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// ─── Day state ──────────────────────────────────────────────────────────────

export type DayStatus = 'open' | 'in_progress' | 'closed'

export interface MilkOpsDayState {
  milking_date: string
  status: DayStatus
  morning_liters: number
  evening_liters: number
  closed_at: string | null
  closed_by: string | null
  reopened_at: string | null
  reopened_by: string | null
  reopen_reason: string | null
  created_at: string
  updated_at: string
}

// ─── API responses ──────────────────────────────────────────────────────────

export interface MilkDailyResponse {
  date: string
  day_state: MilkOpsDayState | null
  sessions: MilkDailySession[]
  entries: (MilkSessionEntry & { goat_name?: string })[]
  goats: MilkGoat[]
  kpi: {
    total_liters: number
    morning_liters: number
    evening_liters: number
    goats_milked: number
    health_flags: number
    avg_7d: number
    avg_30d: number
  }
}

// ─── Milk ops tab ───────────────────────────────────────────────────────────

export type MilkOpsTab = 'milking' | 'pipeline' | 'production' | 'recipes' | 'inventory' | 'analytics'
