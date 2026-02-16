'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowLeft, Clock, Users, ChefHat, Flame } from 'lucide-react'

interface Recipe {
  id: string
  slug: string
  title_no: string
  title_en: string
  intro_no: string
  intro_en: string
  ingredients_no: { amount: string; item: string }[]
  ingredients_en: { amount: string; item: string }[]
  steps_no: string[]
  steps_en: string[]
  tips_no: string
  tips_en: string
  mangalitsa_tip_no: string
  mangalitsa_tip_en: string
  difficulty: 'easy' | 'medium' | 'hard'
  prep_time_minutes: number
  cook_time_minutes: number
  servings: number
  image_url: string
  related_extra_slugs: string[]
  active: boolean
  display_order: number
}

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

export default function RecipeDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { lang, t } = useLanguage()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    async function loadRecipe() {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/recipes/${slug}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('not_found')
          throw new Error('Failed to fetch recipe')
        }
        const data = await res.json()
        if (!isActive) return
        setRecipe(data)
      } catch (err: any) {
        if (!isActive) return
        console.error('Failed to load recipe', err)
        setError(err.message === 'not_found' ? 'not_found' : 'error')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    if (slug) loadRecipe()
    return () => { isActive = false }
  }, [slug, lang])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-white border-b border-neutral-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg py-4">
            <div className="h-4 bg-neutral-100 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="h-[400px] bg-neutral-100 animate-pulse" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg py-12 space-y-6">
          <div className="h-8 bg-neutral-100 rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-neutral-50 rounded w-full animate-pulse" />
          <div className="h-4 bg-neutral-50 rounded w-5/6 animate-pulse" />
        </div>
      </div>
    )
  }

  // 404 / Error state
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-neutral-300 mx-auto mb-6" />
          <h1 className="text-2xl font-normal text-neutral-900 mb-2">
            {error === 'not_found' ? 'Recipe not found' : 'Something went wrong'}
          </h1>
          <Link
            href="/oppskrifter"
            className="text-neutral-600 hover:text-neutral-900 font-light transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.recipes.backToRecipes}
          </Link>
        </div>
      </div>
    )
  }

  const title = lang === 'en' ? recipe.title_en : recipe.title_no
  const intro = lang === 'en' ? recipe.intro_en : recipe.intro_no
  const ingredients = lang === 'en' ? recipe.ingredients_en : recipe.ingredients_no
  const steps = lang === 'en' ? recipe.steps_en : recipe.steps_no
  const tips = lang === 'en' ? recipe.tips_en : recipe.tips_no
  const mangalitsaTip = lang === 'en' ? recipe.mangalitsa_tip_en : recipe.mangalitsa_tip_no
  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <div className="bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg py-4">
          <Link
            href="/oppskrifter"
            className="text-sm font-light text-neutral-500 hover:text-neutral-800 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.recipes.backToRecipes}
          </Link>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
        <img
          src={recipe.image_url}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg">
        {/* Title & Intro */}
        <div className="relative -mt-16 bg-white rounded-xl border border-neutral-100 shadow-sm p-8 sm:p-10 mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <DifficultyBadge difficulty={recipe.difficulty} t={t} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-neutral-900 mb-4 leading-tight">
            {title}
          </h1>

          <p className="text-lg font-light text-neutral-600 leading-relaxed max-w-prose mb-8">
            {intro}
          </p>

          {/* Metadata Bar */}
          <div className="flex flex-wrap gap-6 sm:gap-8 text-sm font-light text-neutral-600 pt-6 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">{t.recipes.prepTime}</div>
                <div>{formatTime(recipe.prep_time_minutes, t)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">{t.recipes.cookTime}</div>
                <div>{formatTime(recipe.cook_time_minutes, t)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">{t.recipes.totalTime}</div>
                <div>{formatTime(totalTime, t)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">{t.recipes.servings}</div>
                <div>{recipe.servings}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout for ingredients + steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Ingredients */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-neutral-100 p-8 sticky top-8">
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 font-semibold mb-6">
                {t.recipes.ingredients}
              </h2>
              <ul className="space-y-3">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-3 text-sm font-light text-neutral-700 leading-relaxed">
                    <span className="font-medium text-neutral-900 whitespace-nowrap min-w-[4rem]">
                      {ing.amount}
                    </span>
                    <span>{ing.item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl border border-neutral-100 p-8 sm:p-10">
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 font-semibold mb-8">
                {t.recipes.steps}
              </h2>
              <ol className="space-y-8">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 text-sm font-medium flex items-center justify-center mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm font-light text-neutral-700 leading-relaxed pt-1.5">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            {tips && (
              <div className="bg-white rounded-xl border border-neutral-100 p-8 sm:p-10">
                <h2 className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 font-semibold mb-4">
                  {t.recipes.tips}
                </h2>
                <p className="text-sm font-light text-neutral-700 leading-relaxed">
                  {tips}
                </p>
              </div>
            )}

            {/* Mangalitsa Tip */}
            {mangalitsaTip && (
              <div className="bg-amber-50/60 rounded-xl border border-amber-200/50 p-8 sm:p-10">
                <h2 className="text-[11px] uppercase tracking-[0.3em] text-amber-700 font-semibold mb-4">
                  {t.recipes.mangalitsaTip}
                </h2>
                <p className="text-sm font-light text-amber-900/80 leading-relaxed">
                  {mangalitsaTip}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {recipe.related_extra_slugs && recipe.related_extra_slugs.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-100 p-8 sm:p-10 mb-16">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 font-semibold mb-4">
              {t.recipes.relatedProducts}
            </h2>
            <p className="text-sm font-light text-neutral-600 mb-6">
              {t.recipes.orderExtra}
            </p>
            <Link
              href="/bestill"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-light rounded-lg hover:bg-neutral-800 transition-colors"
            >
              {t.recipes.relatedProducts}
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  )
}
