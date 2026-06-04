'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Loader2, BookOpen, GitBranch, ChevronDown, ChevronUp, Trash2, Clock, Thermometer } from 'lucide-react'
import type { DairyRecipe, ProductType, Difficulty, RecipeIngredient, RecipeStep } from '@/lib/milk/types'
import { PRODUCT_TYPES, getProductTypeConfig } from '@/lib/milk/types'

interface Props { lang: string }

export function RecipeLibrary({ lang }: Props) {
  const [recipes, setRecipes] = useState<DairyRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<ProductType>('fresh_cheese')
  const [formDesc, setFormDesc] = useState('')
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('medium')
  const [formIngredients, setFormIngredients] = useState('')
  const [formSteps, setFormSteps] = useState('')
  const [formAgingMin, setFormAgingMin] = useState('')
  const [formAgingMax, setFormAgingMax] = useState('')
  const [formYield, setFormYield] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/milk/recipes')
    if (res.ok) { const d = await res.json(); setRecipes(d.recipes || []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  const resetForm = () => {
    setFormName(''); setFormType('fresh_cheese'); setFormDesc(''); setFormDifficulty('medium')
    setFormIngredients(''); setFormSteps(''); setFormAgingMin(''); setFormAgingMax(''); setFormYield('')
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      // Parse ingredients (one per line: "amount unit name")
      const ingredients: RecipeIngredient[] = formIngredients.split('\n').filter(Boolean).map((line, i) => {
        const parts = line.trim().split(/\s+/)
        const amount = parseFloat(parts[0]) || 0
        const unit = parts[1] || ''
        const name = parts.slice(2).join(' ') || parts.slice(1).join(' ') || line
        return { name, amount, unit }
      })

      // Parse steps (one per line)
      const steps: RecipeStep[] = formSteps.split('\n').filter(Boolean).map((line, i) => ({
        order: i + 1, title: `Steg ${i + 1}`, description: line.trim(),
      }))

      const body = {
        name: formName, product_type: formType, description: formDesc || undefined,
        difficulty: formDifficulty, ingredients, steps,
        aging_min_days: formAgingMin ? parseInt(formAgingMin) : undefined,
        aging_max_days: formAgingMax ? parseInt(formAgingMax) : undefined,
        expected_yield_pct: formYield ? parseFloat(formYield) : undefined,
      }

      const url = editingId ? `/api/milk/recipes/${editingId}` : '/api/milk/recipes'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setShowCreate(false); resetForm(); await fetchRecipes() }
    } finally { setSaving(false) }
  }

  const handleFork = async (id: string) => {
    await fetch(`/api/milk/recipes/${id}/fork`, { method: 'POST' })
    await fetchRecipes()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/milk/recipes/${id}`, { method: 'DELETE' })
    await fetchRecipes()
  }

  const startEdit = (recipe: DairyRecipe) => {
    setFormName(recipe.name)
    setFormType(recipe.product_type)
    setFormDesc(recipe.description || '')
    setFormDifficulty(recipe.difficulty)
    setFormIngredients((recipe.ingredients || []).map((i: any) => `${i.amount} ${i.unit} ${i.name}`).join('\n'))
    setFormSteps((recipe.steps || []).map((s: any) => s.description).join('\n'))
    setFormAgingMin(recipe.aging_min_days?.toString() || '')
    setFormAgingMax(recipe.aging_max_days?.toString() || '')
    setFormYield(recipe.expected_yield_pct?.toString() || '')
    setEditingId(recipe.id)
    setShowCreate(true)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-neutral-900">
          <BookOpen className="w-4 h-4 inline mr-1" />
          {lang === 'no' ? 'Oppskrifter' : 'Recipes'} ({recipes.length})
        </h2>
        <button onClick={() => { resetForm(); setShowCreate(!showCreate) }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800">
          <Plus className="w-3.5 h-3.5" />
          {lang === 'no' ? 'Ny oppskrift' : 'New recipe'}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500">{lang === 'no' ? 'Navn' : 'Name'} *</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="Chèvre" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as ProductType)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.emoji} {lang === 'no' ? t.labelNo : t.labelEn}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500">{lang === 'no' ? 'Beskrivelse' : 'Description'}</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">
              {lang === 'no' ? 'Ingredienser (én per linje: mengde enhet navn)' : 'Ingredients (one per line: amount unit name)'}
            </label>
            <textarea value={formIngredients} onChange={(e) => setFormIngredients(e.target.value)} rows={4}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono resize-none"
              placeholder="4 L geitemelk&#10;0.5 tsk løpe&#10;1 ss salt" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">
              {lang === 'no' ? 'Fremgangsmåte (ett steg per linje)' : 'Steps (one per line)'}
            </label>
            <textarea value={formSteps} onChange={(e) => setFormSteps(e.target.value)} rows={4}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-none"
              placeholder={lang === 'no' ? 'Varm melken til 32°C\nTilsett løpe og rør\nLa stå i 45 minutter' : 'Heat milk to 32°C\nAdd rennet and stir\nLet sit for 45 minutes'} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-500">{lang === 'no' ? 'Modning min (dager)' : 'Aging min (days)'}</label>
              <input type="number" value={formAgingMin} onChange={(e) => setFormAgingMin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">{lang === 'no' ? 'Modning max' : 'Aging max'}</label>
              <input type="number" value={formAgingMax} onChange={(e) => setFormAgingMax(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">{lang === 'no' ? 'Utbytte %' : 'Yield %'}</label>
              <input type="number" value={formYield} onChange={(e) => setFormYield(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowCreate(false); resetForm() }}
              className="flex-1 py-2 rounded-lg border border-neutral-200 text-sm">{lang === 'no' ? 'Avbryt' : 'Cancel'}</button>
            <button onClick={handleSave} disabled={saving || !formName}
              className="flex-1 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : lang === 'no' ? 'Lagre' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Recipe list */}
      {recipes.length === 0 ? (
        <p className="text-center text-sm text-neutral-400 py-8">{lang === 'no' ? 'Ingen oppskrifter ennå' : 'No recipes yet'}</p>
      ) : (
        <div className="space-y-2">
          {recipes.map((recipe) => {
            const isExpanded = expanded === recipe.id
            return (
              <div key={recipe.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button onClick={() => setExpanded(isExpanded ? null : recipe.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getProductTypeConfig(recipe.product_type).emoji}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-neutral-900">{recipe.name}</div>
                      <div className="text-[11px] text-neutral-400">v{recipe.version} · {recipe.difficulty}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recipe.aging_min_days && (
                      <span className="text-[11px] text-neutral-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />{recipe.aging_min_days}-{recipe.aging_max_days || '?'}d
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-neutral-100 px-4 py-3 space-y-3">
                    {recipe.description && <p className="text-sm text-neutral-600">{recipe.description}</p>}

                    {recipe.ingredients && (recipe.ingredients as any[]).length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-neutral-500 mb-1">{lang === 'no' ? 'Ingredienser' : 'Ingredients'}</h4>
                        <ul className="text-sm text-neutral-700 space-y-0.5">
                          {(recipe.ingredients as any[]).map((ing, i) => (
                            <li key={i}>• {ing.amount} {ing.unit} {ing.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recipe.steps && (recipe.steps as any[]).length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-neutral-500 mb-1">{lang === 'no' ? 'Fremgangsmåte' : 'Steps'}</h4>
                        <ol className="text-sm text-neutral-700 space-y-1 list-decimal list-inside">
                          {(recipe.steps as any[]).map((step, i) => (
                            <li key={i}>{step.description}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button onClick={() => startEdit(recipe)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200">
                        {lang === 'no' ? 'Rediger' : 'Edit'}
                      </button>
                      <button onClick={() => handleFork(recipe.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" /> {lang === 'no' ? 'Ny versjon' : 'Fork'}
                      </button>
                      <button onClick={() => handleDelete(recipe.id)}
                        className="text-xs px-3 py-1.5 rounded-lg hover:bg-red-100 text-red-500 ml-auto">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
