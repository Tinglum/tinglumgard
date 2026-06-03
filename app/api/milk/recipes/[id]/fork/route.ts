import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { forkRecipe, RecipeError } from '@/lib/milk/recipes'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const recipe = await forkRecipe(params.id, access.session)
    return NextResponse.json({ recipe })
  } catch (error: any) {
    if (error instanceof RecipeError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to fork recipe' }, { status: 500 })
  }
}
