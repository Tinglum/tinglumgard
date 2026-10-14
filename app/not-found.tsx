'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function NotFound() {
  const { lang } = useLanguage()
  const no = lang === 'no'
  return <section className="farm-not-found"><span>404</span><h1>{no ? 'Her var det tomt.' : 'Nothing here yet.'}</h1><p>{no ? 'Siden finnes ikke. Du finner boksene, rugeeggene og kyllingene i gårdsbutikken.' : 'This page does not exist. Find meat boxes, hatching eggs and chicks in the farm shop.'}</p><Link href="/" className="farm-button">{no ? 'Til gårdsbutikken' : 'Back to the farm shop'}<ArrowUpRight size={20} /></Link></section>
}
