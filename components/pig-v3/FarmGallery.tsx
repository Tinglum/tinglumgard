'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import styles from './pig-sales-v3.module.css'

const photos = [
  { src: '/mangalitsa-close.jpg', no: 'Tett på ullgrisen', en: 'Meet the woolly pig', width: 1333, height: 1000 },
  { src: '/mangalitsa-portrait.jpg', no: 'Bust, ører og en nysgjerrig snute', en: 'Bristles, ears and a curious snout', width: 750, height: 1000 },
  { src: '/mangalitsa-winter.jpg', no: 'Ullgrisene ute i snøen', en: 'The pigs out in the snow', width: 1440, height: 810 },
  { src: '/mangalitsa-flokk.jpg', no: 'Flokken i vårlandskapet', en: 'The herd in the spring landscape', width: 1333, height: 1000 },
]

export function FarmGallery() {
  const { lang } = useLanguage()
  const no = lang === 'no'
  const [index, setIndex] = useState(0)
  const active = photos[index]
  return <div className={styles.farmGallery}>
    <div className={styles.galleryHeading}><div><small>{no ? 'Ekte bilder fra gårdsalbumet' : 'Real photos from our farm album'}</small><h2>{no ? 'MØT ULLGRISENE.' : 'MEET THE PIGS.'}</h2></div><a href="#bokser">{no ? 'Se boksene' : 'See the boxes'}<ArrowRight size={18} /></a></div>
    <figure className={styles.galleryLead}>
      <Image key={active.src} src={active.src} alt={no ? active.no : active.en} width={active.width} height={active.height} sizes="(max-width: 767px) 100vw, 85vw" />
      <figcaption aria-live="polite"><span>{no ? active.no : active.en}</span><span>{index + 1} / {photos.length}</span></figcaption>
      <div className={styles.galleryArrows}><button aria-label={no ? 'Forrige gårdsbilde' : 'Previous farm photo'} onClick={() => setIndex(value => (value + photos.length - 1) % photos.length)}><ArrowLeft size={20} /></button><button aria-label={no ? 'Neste gårdsbilde' : 'Next farm photo'} onClick={() => setIndex(value => (value + 1) % photos.length)}><ArrowRight size={20} /></button></div>
    </figure>
    <div className={styles.galleryThumbnails} role="group" aria-label={no ? 'Velg gårdsbilde' : 'Choose a farm photo'}>{photos.map((photo, i) => <button key={photo.src} aria-pressed={index === i} aria-label={no ? photo.no : photo.en} onClick={() => setIndex(i)}><Image src={photo.src} alt="" width={photo.width} height={photo.height} sizes="(max-width: 767px) 22vw, 20vw" /><span>{no ? photo.no : photo.en}</span></button>)}</div>
    <div className={styles.galleryVideos}>
      <details className={styles.farmVideo}><summary>{no ? 'Video: Flokken ute på gården' : 'Video: The herd outdoors'}<ChevronDown size={18} /></summary><video controls playsInline preload="none" poster="/mangalitsa-flokk.jpg" src="/mangalitsa-flokk.mov" aria-label={no ? 'Ullgrisflokken ute på gården' : 'The Mangalitsa herd outdoors'} /><p>{no ? 'April 2026. Avspilling starter når du trykker på play.' : 'April 2026. Press play to start.'}</p></details>
      <details className={styles.farmVideo}><summary>{no ? 'Video: En ullgris på nært hold' : 'Video: A woolly pig up close'}<ChevronDown size={18} /></summary><video className={styles.portraitVideo} controls playsInline preload="none" poster="/mangalitsa-foraging-poster.jpg" src="/mangalitsa-foraging.mov" aria-label={no ? 'Nærvideo av ullgris ute' : 'A close-up video of a pig outdoors'} /><p>{no ? 'April 2026. Originalvideo fra gårdsalbumet.' : 'April 2026. Original footage from the farm album.'}</p></details>
    </div>
  </div>
}
