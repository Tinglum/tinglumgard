'use client'

import Link from 'next/link'
import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export function OrderNextActions({ product, orderId, orderNumber }: { product: 'pig' | 'eggs' | 'chickens'; orderId: string; orderNumber?: string }) {
  const { lang } = useLanguage()
  const no = lang === 'no'
  const queryKey = product === 'pig' ? 'orderId' : product === 'eggs' ? 'eggOrderId' : 'chickenOrderId'
  const accountHref = `/min-side?${queryKey}=${encodeURIComponent(orderId)}`
  const inspirationHref = product === 'pig' ? '/oppskrifter' : product === 'eggs' ? '/rugeegg/rugetips' : '/rugeegg/raser'
  const inspirationLabel = product === 'pig' ? no ? 'Finn middagsinspirasjon' : 'Find dinner inspiration' : product === 'eggs' ? no ? 'Les rugetips' : 'Read hatching tips' : no ? 'Les om hønserasene' : 'Learn about the chicken breeds'

  return <section className="farm-order-handoff" aria-label={no ? 'Følg opp bestillingen' : 'Manage your order'}>
    <div><h2>{no ? 'Neste stopp: Min side.' : 'Next stop: your account.'}</h2><p>{no ? 'Der finner du status, betalinger og meldinger om denne bestillingen. Du kan bli bedt om å logge inn med Vipps.' : 'Find status, payments and messages for this order. You may be asked to log in with Vipps.'}</p></div>
    <div className="farm-handoff-actions"><Link href={accountHref} className="farm-button">{no ? 'Se bestillingen din' : 'View your order'}<ArrowUpRight size={19} /></Link><Link href={inspirationHref}>{inspirationLabel}<ArrowUpRight size={16} /></Link><a href={`mailto:post@tinglum.com?subject=${encodeURIComponent(`${no ? 'Spørsmål om bestilling' : 'Question about order'} ${orderNumber || orderId}`)}`}><MessageCircle size={15} />{no ? 'Spør oss om bestillingen' : 'Ask us about your order'}</a></div>
  </section>
}
