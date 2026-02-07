'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { GlassCard } from '@/components/eggs/GlassCard'

const tipsContent = {
  no: {
    title: 'Rugetips',
    subtitle: 'Praktiske råd for en trygg og vellykket klekking.',
    sections: [
      {
        title: 'Før ruging',
        items: [
          'Oppbevar eggene kjølig (12–16°C) og med spissen ned.',
          'Rugg helst innen 7 dager etter lagt egg for best resultat.',
          'La eggene hvile i romtemperatur 6–8 timer før de legges i rugemaskin.',
          'Vask ikke egg – rengjør bare lett med tørr klut ved behov.'
        ],
      },
      {
        title: 'Under ruging',
        items: [
          'Stabil temperatur: 37,5°C for de fleste raser.',
          'Hold riktig fuktighet (ca. 50–55% dag 1–18).',
          'Vend eggene 3–5 ganger daglig (automatisk vending er best).',
          'Luft rugemaskinen kort daglig etter uke 2.'
        ],
      },
      {
        title: 'Klekking (dag 19–21)',
        items: [
          'Øk fuktigheten til 65–70% fra dag 19.',
          'Stopp vending når klekking starter.',
          'Ikke åpne rugemaskinen unødvendig.',
          'La kyllingene tørke helt før de flyttes.'
        ],
      },
      {
        title: 'Etter klekking',
        items: [
          'Hold kyllingene varmt (32–35°C første uke).',
          'Gi tilgang til vann og startfôr umiddelbart.',
          'Senk temperaturen gradvis 2–3°C per uke.',
          'Observer aktivitet og appetitt – det er beste helsesignal.'
        ],
      },
    ],
    note: 'Har du spørsmål? Ta kontakt – vi hjelper gjerne.',
  },
  en: {
    title: 'Hatching Tips',
    subtitle: 'Practical guidance for a safe, successful hatch.',
    sections: [
      {
        title: 'Before incubation',
        items: [
          'Store eggs cool (12–16°C) with the point down.',
          'Incubate within 7 days of lay for best results.',
          'Let eggs rest at room temperature 6–8 hours before setting.',
          'Do not wash eggs – dry clean only if needed.'
        ],
      },
      {
        title: 'During incubation',
        items: [
          'Stable temperature: 37.5°C for most breeds.',
          'Keep humidity around 50–55% days 1–18.',
          'Turn eggs 3–5 times daily (automatic turning preferred).',
          'Vent the incubator briefly after week 2.'
        ],
      },
      {
        title: 'Hatching (days 19–21)',
        items: [
          'Increase humidity to 65–70% from day 19.',
          'Stop turning when hatch begins.',
          'Avoid opening the incubator unnecessarily.',
          'Let chicks dry fully before moving.'
        ],
      },
      {
        title: 'After hatch',
        items: [
          'Keep chicks warm (32–35°C first week).',
          'Provide water and starter feed immediately.',
          'Lower temperature by 2–3°C per week.',
          'Monitor activity and appetite – best health indicators.'
        ],
      },
    ],
    note: 'Questions? Reach out — we’re happy to help.',
  }
}

export default function RugeTipsPage() {
  const { lang } = useLanguage()
  const content = lang === 'no' ? tipsContent.no : tipsContent.en

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-neutral-900 mb-3">
            {content.title}
          </h1>
          <p className="text-lg text-neutral-600 max-w-prose">
            {content.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.sections.map((section) => (
            <GlassCard key={section.title} className="p-6">
              <h2 className="text-xl font-display font-semibold text-neutral-900 mb-4">
                {section.title}
              </h2>
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

        <div className="mt-10 text-sm text-neutral-600">
          {content.note}
        </div>
      </div>
    </div>
  )
}
