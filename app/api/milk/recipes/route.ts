import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getRecipes, createRecipe, RecipeError } from '@/lib/milk/recipes'
import type { ProductType } from '@/lib/milk/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const type = request.nextUrl.searchParams.get('type') as ProductType | null
    const recipes = await getRecipes({ product_type: type || undefined })
    return NextResponse.json({ recipes })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch recipes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const recipe = await createRecipe(body, access.session)
    return NextResponse.json({ recipe })
  } catch (error: any) {
    if (error instanceof RecipeError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to create recipe' }, { status: 500 })
  }
}
