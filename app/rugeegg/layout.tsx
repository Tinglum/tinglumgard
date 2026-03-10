import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { no } from '@/content/copy.no'
import { en } from '@/content/copy.en'
import { EggProviders } from './EggProviders'

function resolveLanguage(acceptLanguage: string | null): 'no' | 'en' {
  if (!acceptLanguage) return 'no'
  const normalized = acceptLanguage.toLowerCase()
  if (normalized.includes('en') && !normalized.includes('nb') && !normalized.includes('nn')) {
    return 'en'
  }
  return 'no'
}

export function generateMetadata(): Metadata {
  const acceptLanguage = headers().get('accept-language')
  const lang = resolveLanguage(acceptLanguage)
  const copy = lang === 'en' ? en : no

  return {
    title: copy.eggsHero.title,
    description: copy.eggsHero.subtitle,
    openGraph: {
      title: copy.eggsHero.title,
      description: copy.eggsHero.subtitle,
    },
  }
}

export default function RugeggLayout({ children }: { children: ReactNode }) {
  return <EggProviders>{children}</EggProviders>
}
