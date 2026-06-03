import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getRecipeById, updateRecipe, deleteRecipe, RecipeError } from '@/lib/milk/recipes'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const recipe = await getRecipeById(params.id)
    return NextResponse.json({ recipe })
  } catch (error: any) {
    if (error instanceof RecipeError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to fetch recipe' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const recipe = await updateRecipe(params.id, body, access.session)
    return NextResponse.json({ recipe })
  } catch (error: any) {
    if (error instanceof RecipeError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to update recipe' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    await deleteRecipe(params.id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error instanceof RecipeError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to delete recipe' }, { status: 500 })
  }
}
