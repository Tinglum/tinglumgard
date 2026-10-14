'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type JourneyStep = { label: string; href?: string }

export function FarmJourney({ steps, current, onStepChange }: { steps: JourneyStep[]; current: number; onStepChange?: (index: number) => void }) {
  const { lang } = useLanguage()
  return <nav className="farm-journey" aria-label={lang === 'no' ? 'Steg i bestillingen' : 'Order steps'}>
    <p>{lang === 'no' ? 'Steg' : 'Step'} {current + 1} / {steps.length}<span>{steps[current]?.label}</span></p>
    <ol>{steps.map((step, index) => {
      const content = <><span className="farm-step-number">{index < current ? <Check size={14} aria-hidden="true" /> : index + 1}</span><span>{step.label}</span></>
      return <li key={step.label} data-progress={index === current ? 'current' : index < current ? 'complete' : 'future'}>{onStepChange ? <button type="button" aria-current={index === current ? 'step' : undefined} disabled={index > current} onClick={() => onStepChange(index)}>{content}</button> : step.href && index < current ? <Link href={step.href}>{content}</Link> : <span aria-current={index === current ? 'step' : undefined}>{content}</span>}</li>
    })}</ol>
  </nav>
}

export function EggJourney({ current }: { current: 0 | 1 | 2 }) {
  const { lang } = useLanguage()
  return <FarmJourney current={current} steps={[
    { label: lang === 'no' ? 'Handlekurv' : 'Cart', href: '/rugeegg/handlekurv' },
    { label: lang === 'no' ? 'Levering' : 'Delivery', href: '/rugeegg/bestill/levering' },
    { label: lang === 'no' ? 'Betaling' : 'Payment', href: '/rugeegg/bestill/betaling' },
  ]} />
}
