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

/** Goat from the goat-lineage Supabase project */
export interface GoatLineageGoat {
  id: string
  name: string
  sex: string
  isAlive: boolean
  earTag: string | null
  dateOfBirth: string | null
}

// ─── Daily milking ──────────────────────────────────────────────────────────

export type SessionType = 'morning' | 'evening' | 'extra'
export type MilkingMethod = 'machine' | 'hand'

export interface MilkDailySession {
  id: string
  milking_date: string
  session_type: SessionType
  milking_method: MilkingMethod
  total_grams: number
  gross_weight_grams: number
  bottle_count: number
  custom_tare_grams: number
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
  grams: number
  health_flag: HealthFlag
  health_notes: string | null
  created_at: string
  updated_at: string
}

// ─── Tare weight constants ─────────────────────────────────────────────────

export const BOTTLE_TARE_GRAMS = 213

export function computeNetGrams(grossGrams: number, bottleCount: number, customTareGrams: number): number {
  return Math.max(0, grossGrams - (bottleCount * BOTTLE_TARE_GRAMS) - customTareGrams)
}

export function gramsToDeciliters(grams: number): number {
  // Goat milk density ~1.032 g/ml, 1 dl = 100 ml
  return Math.round(grams / 103.2 * 10) / 10
}

export function decilitersToGrams(dl: number): number {
  return Math.round(dl * 103.2)
}

// ─── Recipes ────────────────────────────────────────────────────────────────

export type ProductType =
  | 'fresh_cheese'      // Ferskost
  | 'cottage_cheese'    // Cottage cheese
  | 'brown_cheese'      // Brunost
  | 'hard_cheese'       // Hardost (med løpe)
  | 'semi_hard_cheese'  // Halvfast ost
  | 'soft_cheese'       // Mykost
  | 'blue_cheese'       // Blåmuggost
  | 'chevre'            // Chèvre
  | 'cream_cheese'      // Kremost
  | 'washed_rind'       // Vasket skorpe
  | 'yoghurt'
  | 'butter'
  | 'cream'
  | 'kefir'
  | 'skyr'
  | 'other'

export const PRODUCT_TYPES: { id: ProductType; emoji: string; labelNo: string; labelEn: string; canAge: boolean }[] = [
  { id: 'fresh_cheese',     emoji: '🧀', labelNo: 'Ferskost',           labelEn: 'Fresh cheese',     canAge: false },
  { id: 'cottage_cheese',   emoji: '🥣', labelNo: 'Cottage cheese',     labelEn: 'Cottage cheese',   canAge: false },
  { id: 'brown_cheese',     emoji: '🟫', labelNo: 'Brunost',            labelEn: 'Brown cheese',     canAge: false },
  { id: 'chevre',           emoji: '🐐', labelNo: 'Chèvre',             labelEn: 'Chèvre',           canAge: true },
  { id: 'cream_cheese',     emoji: '🍦', labelNo: 'Kremost',            labelEn: 'Cream cheese',     canAge: false },
  { id: 'soft_cheese',      emoji: '🧈', labelNo: 'Mykost',             labelEn: 'Soft cheese',      canAge: true },
  { id: 'semi_hard_cheese', emoji: '🧀', labelNo: 'Halvfast ost',       labelEn: 'Semi-hard cheese', canAge: true },
  { id: 'hard_cheese',      emoji: '🪨', labelNo: 'Hardost (med løpe)', labelEn: 'Hard cheese',      canAge: true },
  { id: 'blue_cheese',      emoji: '🔵', labelNo: 'Blåmuggost',         labelEn: 'Blue cheese',      canAge: true },
  { id: 'washed_rind',      emoji: '🟠', labelNo: 'Vasket skorpe',      labelEn: 'Washed rind',      canAge: true },
  { id: 'yoghurt',          emoji: '🥛', labelNo: 'Yoghurt',            labelEn: 'Yoghurt',          canAge: false },
  { id: 'butter',           emoji: '🧈', labelNo: 'Smør',               labelEn: 'Butter',           canAge: false },
  { id: 'cream',            emoji: '🍦', labelNo: 'Fløte',              labelEn: 'Cream',            canAge: false },
  { id: 'kefir',            emoji: '🥤', labelNo: 'Kefir',              labelEn: 'Kefir',            canAge: false },
  { id: 'skyr',             emoji: '🥣', labelNo: 'Skyr',               labelEn: 'Skyr',             canAge: false },
  { id: 'other',            emoji: '🍶', labelNo: 'Annet',              labelEn: 'Other',            canAge: false },
]

export function getProductTypeConfig(id: ProductType) {
  return PRODUCT_TYPES.find((t) => t.id === id) || PRODUCT_TYPES[PRODUCT_TYPES.length - 1]
}

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

/** All valid status transitions — including backwards (revert) */
export const PRODUCTION_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  in_progress: ['aging', 'ready', 'discarded'],
  aging: ['in_progress', 'ready', 'discarded'],
  ready: ['aging', 'consumed', 'sold', 'discarded'],
  consumed: ['ready'],
  sold: ['ready'],
  discarded: ['in_progress'],
}

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
  morning_grams: number
  evening_grams: number
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
    total_grams: number
    morning_grams: number
    evening_grams: number
    goats_milked: number
    health_flags: number
    avg_7d: number
    avg_30d: number
  }
}

// ─── Milk ops tab ───────────────────────────────────────────────────────────

export type MilkOpsTab = 'milking' | 'production' | 'recipes' | 'inventory' | 'analytics'
