'use client'

import { useMemo, useState } from 'react'
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
  const { lang, t } = useLanguage()
  const chickens = (t as any).chickens
  const commonCopy = chickens.common
  const breedCardCopy = chickens.breedCards
  const locale = lang === 'en' ? 'en-GB' : 'nb-NO'
  const description = lang === 'en' ? breed.description_en : breed.description_no

  const visualProfile = resolveBreedVisualProfile(breed)
  const imageCandidates = useMemo(() => {
    const candidates = [
      visualProfile.realImageUrl || '',
      breed.image_url?.trim() || '',
      visualProfile.placeholderImageUrl || '',
    ].filter(Boolean)

    return Array.from(new Set(candidates))
  }, [breed.image_url, visualProfile.placeholderImageUrl, visualProfile.realImageUrl])
  const [imageIndex, setImageIndex] = useState(0)

  const imageSrc = imageCandidates[imageIndex] || ''
  const showImage = Boolean(imageSrc)

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
      style={{
        boxShadow: `0 1px 0 ${withAlpha(visualProfile.accentColor, 14)}`,
      }}
    >
      {showImage ? (
        <div className="relative h-44 overflow-hidden bg-neutral-100">
          <img
            src={imageSrc}
            alt={breed.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => {
              setImageIndex((prev) => {
                if (prev < imageCandidates.length - 1) return prev + 1
                return imageCandidates.length
              })
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${withAlpha(visualProfile.accentColor, 30)} 100%)`,
            }}
          />
        </div>
      ) : (
        <div
          className="flex h-44 items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(visualProfile.accentColor, 40)} 0%, ${withAlpha(visualProfile.accentColor, 18)} 100%)`,
          }}
        >
          <span className="text-4xl font-semibold" style={{ color: visualProfile.accentColor }}>
            {breed.name.charAt(0)}
          </span>
        </div>
      )}

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="min-w-0">
            <div className="mb-1 flex items-start gap-2">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: visualProfile.accentColor }} />
              <h3 className="text-lg font-medium leading-snug text-neutral-900">{breed.name}</h3>
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">{description}</p>
          </div>

          <span
            className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide"
            style={{
              borderColor: withAlpha(visualProfile.accentColor, 30),
              color: withAlpha(visualProfile.accentColor, 95),
              backgroundColor: withAlpha(visualProfile.accentColor, 10),
            }}
          >
            {breed.slug?.toUpperCase() || 'BREED'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">{breedCardCopy.priceFrom}</p>
            <p className="text-base font-semibold text-neutral-900">
              {commonCopy.currency} {formatPrice(breed.start_price_nok, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">{breedCardCopy.adultPrice}</p>
            <p className="text-base font-semibold text-neutral-900">
              {commonCopy.currency} {formatPrice(breed.adult_price_nok, locale)}
            </p>
          </div>
        </div>

        {breed.sell_roosters && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
            {breedCardCopy.roostersAvailable}: {commonCopy.currency}{' '}
            {formatPrice(breed.rooster_price_nok, locale)}
          </p>
        )}
      </div>
    </article>
  )
}

type BreedVisualProfile = {
  accentColor: string
  placeholderImageUrl: string
  realImageUrl?: string
}

const RUGE_EGG_BREED_COLORS: Record<string, string> = {
  'ayam-cemani': '#1A1A1A',
  'jersey-giant': '#C8A26A',
  silverudds: '#6B7F3A',
  'silverudds-bla': '#6B7F3A',
  'silverudds-blue': '#6B7F3A',
  'cream-legbar': '#8FD9D6',
  maran: '#5A2A1D',
}

const BREED_PLACEHOLDER_IMAGES: Record<string, string> = {
  'ayam-cemani': 'https://images.pexels.com/photos/2403392/pexels-photo-2403392.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'jersey-giant': 'https://images.pexels.com/photos/1769279/pexels-photo-1769279.jpeg?auto=compress&cs=tinysrgb&w=1400',
  silverudds: 'https://images.pexels.com/photos/2255441/pexels-photo-2255441.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'silverudds-bla': 'https://images.pexels.com/photos/2255441/pexels-photo-2255441.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'silverudds-blue': 'https://images.pexels.com/photos/2255441/pexels-photo-2255441.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'cream-legbar': 'https://images.pexels.com/photos/375510/pexels-photo-375510.jpeg?auto=compress&cs=tinysrgb&w=1400',
  maran: 'https://images.pexels.com/photos/1300375/pexels-photo-1300375.jpeg?auto=compress&cs=tinysrgb&w=1400',
}

const BREED_REAL_IMAGES: Record<string, string> = {
  'ayam-cemani': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Poule_cemani.jpg/640px-Poule_cemani.jpg',
  'jersey-giant': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/OntarioCountyFair2018JerseyGiantCockerel.jpg/640px-OntarioCountyFair2018JerseyGiantCockerel.jpg',
  maran: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Cuckoo_Marans.jpg/640px-Cuckoo_Marans.jpg',
  'cream-legbar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Cream_Legbar.jpg/640px-Cream_Legbar.jpg',
  silverudds: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Silveruddsbl%C3%A5_hen.jpg/640px-Silveruddsbl%C3%A5_hen.jpg',
  'silverudds-bla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Silveruddsbl%C3%A5_hen.jpg/640px-Silveruddsbl%C3%A5_hen.jpg',
  'silverudds-blue': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Silveruddsbl%C3%A5_hen.jpg/640px-Silveruddsbl%C3%A5_hen.jpg',
}

const DEFAULT_PLACEHOLDER_IMAGE =
  'https://images.pexels.com/photos/1216482/pexels-photo-1216482.jpeg?auto=compress&cs=tinysrgb&w=1400'

function normalizeBreedKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/\s+/g, '-')
}

function resolveBreedVisualProfile(breed: ChickenBreedCardProps['breed']): BreedVisualProfile {
  const slugKey = normalizeBreedKey(breed.slug || '')
  const nameKey = normalizeBreedKey(breed.name || '')

  const key = RUGE_EGG_BREED_COLORS[slugKey]
    ? slugKey
    : RUGE_EGG_BREED_COLORS[nameKey]
      ? nameKey
      : slugKey

  return {
    accentColor: RUGE_EGG_BREED_COLORS[key] || breed.accent_color || '#6B7280',
    placeholderImageUrl: BREED_PLACEHOLDER_IMAGES[key] || DEFAULT_PLACEHOLDER_IMAGE,
    realImageUrl: BREED_REAL_IMAGES[key],
  }
}

function withAlpha(hex: string, alphaPercent: number): string {
  const safeHex = (hex || '').replace('#', '')
  if (safeHex.length !== 6) return hex
  const alpha = Math.round((Math.max(0, Math.min(100, alphaPercent)) / 100) * 255)
  return `#${safeHex}${alpha.toString(16).padStart(2, '0')}`
}

function formatPrice(value: number, locale: string): string {
  return Math.round(Number(value) || 0).toLocaleString(locale)
}
