'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, Users, ChefHat } from 'lucide-react'
import { no as copyNo } from '@/content/copy.no'

interface Recipe {
  id: string
  slug: string
  title_no: string
  title_en: string
  intro_no: string
  intro_en: string
  difficulty: 'easy' | 'medium' | 'hard'
  prep_time_minutes: number
  cook_time_minutes: number
  servings: number
  image_url: string
  active: boolean
  display_order: number
}

const DIY_RECIPE_SLUGS = new Set([
  'coppa-project',
  'lardo-crostini',
  'rendered-lard',
  'pancetta-project',
  'cure-ham',
])

function formatTime(minutes: number, t: any): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remaining = minutes % 60
    if (remaining === 0) return `${hours} ${t.recipes.hours}`
    return `${hours} ${t.recipes.hours} ${remaining} ${t.recipes.minutes}`
  }
  return `${minutes} ${t.recipes.minutes}`
}

function DifficultyBadge({ difficulty, t }: { difficulty: string; t: any }) {
  const colors: Record<string, string> = {
    easy: 'bg-green-50 text-green-700 border-green-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    hard: 'bg-red-50 text-red-700 border-red-200',
  }
  const label = t.recipes[difficulty as keyof typeof t.recipes] || difficulty
  return (
    <span className={`text-[11px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full border ${colors[difficulty] || colors.medium}`}>
      {label}
    </span>
  )
}

function RecipeCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-neutral-100 animate-pulse">
      <div className="h-56 bg-neutral-100" />
      <div className="p-6 space-y-3">
        <div className="h-5 bg-neutral-100 rounded w-3/4" />
        <div className="h-4 bg-neutral-50 rounded w-1/2" />
        <div className="flex gap-4 mt-4">
          <div className="h-4 bg-neutral-50 rounded w-20" />
          <div className="h-4 bg-neutral-50 rounded w-20" />
          <div className="h-4 bg-neutral-50 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

export default function RecipesPage() {
  const t = copyNo
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    async function loadRecipes() {
      try {
        setIsLoading(true)
        const res = await fetch('/api/recipes')
        if (!res.ok) throw new Error('Failed to fetch recipes')
        const data = await res.json()
        if (!isActive) return
        const list = data.recipes || data || []
        setRecipes(list.filter((r: Recipe) => r.active).sort((a: Recipe, b: Recipe) => a.display_order - b.display_order))
      } catch (err) {
        if (!isActive) return
        console.error('Failed to load recipes', err)
        setError('Could not load recipes')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadRecipes()
    return () => { isActive = false }
  }, [])

  const mainRecipes = recipes.filter((recipe) => !DIY_RECIPE_SLUGS.has(recipe.slug))
  const diyRecipes = recipes.filter((recipe) => DIY_RECIPE_SLUGS.has(recipe.slug))

  const renderRecipeGrid = (items: Recipe[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {items.map((recipe) => {
        const title = recipe.title_no
        const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes

        return (
          <Link
            key={recipe.id}
            href={`/oppskrifter/${recipe.slug}`}
            className="group"
          >
            <article className="rounded-xl overflow-hidden bg-white border border-neutral-100 hover:border-neutral-200 hover:shadow-lg transition-all duration-300">
              <div className="relative h-56 overflow-hidden">
                <img
                  src={recipe.image_url || '/recipes/carbonara-guanciale.jpg'}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <DifficultyBadge difficulty={recipe.difficulty} t={t} />
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-xl font-normal text-neutral-900 mb-3 group-hover:text-neutral-700 transition-colors leading-snug">
                  {title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-sm font-light text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(totalTime, t)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {recipe.servings} {t.recipes.servings.toLowerCase()}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-50 flex items-center justify-between">
                  <span className="text-sm font-light text-neutral-500 group-hover:text-neutral-800 transition-colors">
                    {t.recipes.viewRecipe}
                  </span>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </article>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl py-4">
          <Link
            href="/"
            className="text-sm font-light text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            Tinglumgard
          </Link>
        </div>
      </div>

      {/* Hero section */}
      <div className="bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl py-16 sm:py-20">
          <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-neutral-900 mb-4 leading-tight">
            {t.recipes.pageTitle}
          </h1>
          <p className="text-lg font-light text-neutral-600 max-w-2xl leading-relaxed">
            {t.recipes.pageSubtitle}
          </p>
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl py-12 sm:py-16">
        {error && (
          <div className="text-sm text-red-600 mb-8">{error}</div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500 font-light text-lg">
              {t.recipes.noRecipes}
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {mainRecipes.length > 0 && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-normal text-neutral-900">{t.recipes.mainSectionTitle}</h2>
                  <p className="text-sm font-light text-neutral-500 mt-1">{t.recipes.mainSectionSubtitle}</p>
                </div>
                {renderRecipeGrid(mainRecipes)}
              </section>
            )}

            {diyRecipes.length > 0 && (
              <section className="pt-10 border-t border-neutral-200">
                <div className="mb-6">
                  <h2 className="text-2xl font-normal text-neutral-900">{t.recipes.diySectionTitle}</h2>
                  <p className="text-sm font-light text-neutral-500 mt-1">{t.recipes.diySectionSubtitle}</p>
                </div>
                {renderRecipeGrid(diyRecipes)}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
