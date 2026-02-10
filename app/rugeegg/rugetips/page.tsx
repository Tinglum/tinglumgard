'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { GlassCard } from '@/components/eggs/GlassCard'

export default function RugeTipsPage() {
  const { t } = useLanguage()
  const content = t.eggs.hatchingTips

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-neutral-900 mb-3">
            {content.title}
          </h1>
          <p className="text-lg text-neutral-600 max-w-prose">{content.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.sections.map((section) => (
            <GlassCard key={section.title} className="p-6">
              <h2 className="text-xl font-normal text-neutral-900 mb-4">{section.title}</h2>
              <ul className="space-y-3 text-sm text-neutral-700">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>

        <div className="mt-10 text-sm text-neutral-600">{content.note}</div>
      </div>
    </div>
  )
}
