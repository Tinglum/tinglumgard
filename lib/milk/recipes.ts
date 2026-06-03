import { supabaseAdmin } from '@/lib/supabase/server'
import type { SessionData } from '@/lib/auth/session'
import type { DairyRecipe, ProductType, Difficulty } from './types'

export class RecipeError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'RecipeError'
    this.status = status
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function getRecipes(filters?: {
  product_type?: ProductType
  active_only?: boolean
}): Promise<DairyRecipe[]> {
  let query = supabaseAdmin
    .from('dairy_recipes')
    .select('*')
    .order('name', { ascending: true })

  if (filters?.product_type) query = query.eq('product_type', filters.product_type)
  if (filters?.active_only !== false) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new RecipeError(`Failed to fetch recipes: ${error.message}`, 500)
  return data || []
}

export async function getRecipeById(id: string): Promise<DairyRecipe> {
  const { data, error } = await supabaseAdmin
    .from('dairy_recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw new RecipeError('Recipe not found', 404)
  return data
}

export async function createRecipe(
  body: {
    name: string
    product_type: ProductType
    description?: string
    ingredients?: unknown[]
    steps?: unknown[]
    aging_min_days?: number
    aging_max_days?: number
    aging_temp_celsius?: number
    aging_humidity_pct?: number
    difficulty?: Difficulty
    expected_yield_pct?: number
  },
  session: SessionData | null
): Promise<DairyRecipe> {
  if (!body.name?.trim()) throw new RecipeError('Name is required')

  const slug = slugify(body.name) + '-' + Math.random().toString(36).slice(2, 5)
  const actor = session?.name || 'anonymous'

  const { data, error } = await supabaseAdmin
    .from('dairy_recipes')
    .insert({
      name: body.name.trim(),
      slug,
      product_type: body.product_type || 'cheese',
      description: body.description?.trim() || null,
      ingredients: body.ingredients || [],
      steps: body.steps || [],
      aging_min_days: body.aging_min_days ?? null,
      aging_max_days: body.aging_max_days ?? null,
      aging_temp_celsius: body.aging_temp_celsius ?? null,
      aging_humidity_pct: body.aging_humidity_pct ?? null,
      difficulty: body.difficulty || 'medium',
      expected_yield_pct: body.expected_yield_pct ?? null,
      created_by: actor,
    })
    .select()
    .single()

  if (error) throw new RecipeError(`Failed to create recipe: ${error.message}`, 500)
  return data
}

export async function updateRecipe(
  id: string,
  body: Partial<DairyRecipe>,
  _session: SessionData | null
): Promise<DairyRecipe> {
  const { data, error } = await supabaseAdmin
    .from('dairy_recipes')
    .update({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.ingredients !== undefined && { ingredients: body.ingredients }),
      ...(body.steps !== undefined && { steps: body.steps }),
      ...(body.aging_min_days !== undefined && { aging_min_days: body.aging_min_days }),
      ...(body.aging_max_days !== undefined && { aging_max_days: body.aging_max_days }),
      ...(body.aging_temp_celsius !== undefined && { aging_temp_celsius: body.aging_temp_celsius }),
      ...(body.aging_humidity_pct !== undefined && { aging_humidity_pct: body.aging_humidity_pct }),
      ...(body.difficulty !== undefined && { difficulty: body.difficulty }),
      ...(body.expected_yield_pct !== undefined && { expected_yield_pct: body.expected_yield_pct }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new RecipeError(`Failed to update recipe: ${error.message}`, 500)
  return data
}

export async function forkRecipe(id: string, session: SessionData | null): Promise<DairyRecipe> {
  const parent = await getRecipeById(id)
  const actor = session?.name || 'anonymous'

  // Find highest version for this lineage
  const rootId = parent.parent_recipe_id || parent.id
  const { data: versions } = await supabaseAdmin
    .from('dairy_recipes')
    .select('version')
    .or(`id.eq.${rootId},parent_recipe_id.eq.${rootId}`)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version || parent.version) + 1
  const slug = slugify(parent.name) + '-v' + nextVersion + '-' + Math.random().toString(36).slice(2, 5)

  const { data, error } = await supabaseAdmin
    .from('dairy_recipes')
    .insert({
      name: parent.name,
      slug,
      product_type: parent.product_type,
      version: nextVersion,
      parent_recipe_id: parent.id,
      description: parent.description,
      ingredients: parent.ingredients,
      steps: parent.steps,
      aging_min_days: parent.aging_min_days,
      aging_max_days: parent.aging_max_days,
      aging_temp_celsius: parent.aging_temp_celsius,
      aging_humidity_pct: parent.aging_humidity_pct,
      difficulty: parent.difficulty,
      expected_yield_pct: parent.expected_yield_pct,
      created_by: actor,
    })
    .select()
    .single()

  if (error) throw new RecipeError(`Failed to fork recipe: ${error.message}`, 500)
  return data
}

export async function deleteRecipe(id: string): Promise<void> {
  // Soft delete — mark inactive
  const { error } = await supabaseAdmin
    .from('dairy_recipes')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new RecipeError(`Failed to delete recipe: ${error.message}`, 500)
}
