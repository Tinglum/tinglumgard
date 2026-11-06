import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import { RecipeList } from '@/components/todotwo/tasks/recipe-list'

export const dynamic = 'force-dynamic'

export default async function RecipesPage() {
  await requireTodoTwoUser(`${TODOTWO_BASE}/recipes`)
  const db = getTodoTwoClient()
  const { data: sections, error: sectionError } = await db.from('sections').select('id').eq('name', 'Recipes').is('deleted_at', null)
  if (sectionError) throw new Error(sectionError.message)
  const ids = (sections ?? []).map(section => section.id)
  const { data: recipes, error } = ids.length ? await db.from('tasks').select('id,title,description')
    .in('section_id', ids).is('deleted_at', null).is('parent_task_id', null).order('title') : { data: [], error: null }
  if (error) throw new Error(error.message)
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <header><h1 className="text-2xl">Recipes</h1><p className="mt-2 text-sm text-[var(--tt-ink-2)]">Farm favourites and cooking instructions. Open a recipe to read it.</p></header>
    <RecipeList recipes={recipes ?? []} />
  </div>
}
