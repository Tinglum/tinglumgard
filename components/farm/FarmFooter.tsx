'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export function FarmFooter({ operational = false, compact = false }: { operational?: boolean; compact?: boolean }) {
  const { lang, t } = useLanguage()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'joined' | 'error'>('idle')
  const text = (norwegian: string, english: string) => lang === 'no' ? norwegian : english

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('sending')
    try {
      const response = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }) })
      if (!response.ok) throw new Error('Waitlist unavailable')
      setState('joined')
      setEmail('')
      setName('')
    } catch { setState('error') }
  }

  return <footer className={`farm-footer ${operational || compact ? 'farm-footer-compact' : ''}`}>
    {!operational && !compact && <div className="farm-footer-top"><div><Link href="/" className="farm-footer-wordmark">TINGLUM GÅRD.</Link><p>{text('Ullgris, rugeegg og kyllinger fra Namdalseid.', 'Mangalitsa pork, hatching eggs and chicks from Namdalseid.')}</p><a href="mailto:post@tinglum.com">post@tinglum.com<ArrowUpRight size={17} /></a><a href="https://www.instagram.com/tinglum.farm" target="_blank" rel="noopener noreferrer">Instagram<ArrowUpRight size={17} /></a></div><nav aria-label={text('Utforsk gården', 'Explore the farm')}><Link href="/produkt">{text('Om ullgrisen', 'About Mangalitsa')}</Link><Link href="/oppdelingsplan">{text('Stykningsdelene', 'The cuts')}</Link><Link href="/rugeegg/raser">{text('Hønserasene', 'Chicken breeds')}</Link><Link href="/rugeegg/rugetips">{text('Rugetips', 'Hatching tips')}</Link><Link href="/oppskrifter">{text('Oppskrifter', 'Recipes')}</Link><Link href="/min-side">{text('Min side', 'My account')}</Link></nav><div className="farm-waitlist"><h2>{t.productCard.nextSeasonWaitlistTitle}</h2>{state === 'joined' ? <p role="status">{t.productCard.waitlistSuccess}</p> : <form onSubmit={join}><label htmlFor="farm-waitlist-email">{text('E-post', 'Email')}<input id="farm-waitlist-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><label htmlFor="farm-waitlist-name">{text('Navn (valgfritt)', 'Name (optional)')}<input id="farm-waitlist-name" name="name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>{state === 'error' && <p role="alert">{text('Kunne ikke registrere deg. Prøv igjen.', 'We could not register you. Please try again.')}</p>}<button type="submit" className="farm-button" disabled={state === 'sending'}>{state === 'sending' ? t.common.processing : t.productCard.submitWaitlist}<ArrowUpRight size={17} /></button><small>{text('Les hvordan vi behandler opplysningene dine i', 'Read how we handle your details in our')} <Link href="/personvern">{text('personvernerklæringen', 'privacy policy')}</Link>.</small></form>}</div></div>}
    <div className="farm-footer-bottom"><span>{operational ? 'TINGLUM GÅRD · DRIFT' : 'Namdalseid · Trøndelag'}</span><div><Link href="/personvern">{text('Personvern', 'Privacy')}</Link><Link href="/vilkar">{text('Vilkår', 'Terms')}</Link>{operational && <Link href="/">{text('Gårdsbutikken', 'Farm shop')}</Link>}</div></div>
  </footer>
}
