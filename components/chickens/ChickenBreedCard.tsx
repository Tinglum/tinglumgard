'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface ChickenBreedCardProps {
  breed: {
    id: string
    name: string
    slug: string
    accent_color: string
    description_no: string
    description_en: string
    image_url: string
    start_price_nok: number
    adult_price_nok: number
    sell_roosters: boolean
    rooster_price_nok: number
  }
}

export function ChickenBreedCard({ breed }: ChickenBreedCardProps) {
  const { lang } = useLanguage()
  const description = lang === 'en' ? breed.description_en : breed.description_no

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow">
      {breed.image_url && (
        <div className="h-40 bg-neutral-100 overflow-hidden">
          <img src={breed.image_url} alt={breed.name} className="w-full h-full object-cover" />
        </div>
      )}
      {!breed.image_url && (
        <div className="h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
          <span className="text-4xl">🐔</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: breed.accent_color }} />
          <h3 className="text-lg font-medium text-neutral-900">{breed.name}</h3>
        </div>
        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{description}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-neutral-500">
            {lang === 'en' ? 'From' : 'Fra'} <span className="font-semibold text-neutral-900">kr {breed.start_price_nok}</span>
          </span>
          <span className="text-xs text-neutral-400">→</span>
          <span className="text-sm text-neutral-500">
            {lang === 'en' ? 'Adult' : 'Voksen'} <span className="font-semibold text-neutral-900">kr {breed.adult_price_nok}</span>
          </span>
        </div>
        {breed.sell_roosters && (
          <p className="text-xs text-amber-600 mt-1">
            {lang === 'en' ? 'Roosters available' : 'Haner tilgjengelig'}: kr {breed.rooster_price_nok}
          </p>
        )}
      </div>
    </div>
  )
}
