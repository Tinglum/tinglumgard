import { Surface } from '@/components/todotwo/ui/states'

export function RecipeList({ recipes }: { recipes: { id: string; title: string; description: string | null }[] }) {
  return <>
    {!recipes.length && <p>No recipes yet.</p>}
    {recipes.map(recipe => <Surface key={recipe.id} className="px-4"><details id={recipe.id}>
      <summary className="cursor-pointer py-4 font-semibold">{recipe.title}</summary>
      <div className="whitespace-pre-wrap break-words pb-5 text-sm leading-relaxed">{recipe.description || 'No instructions added yet.'}</div>
    </details></Surface>)}
  </>
}
