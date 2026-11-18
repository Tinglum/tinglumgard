'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import styles from './pig-sales-v3.module.css'

const photos = [
  { src: '/mangalitsa-flowers.jpg', no: 'Ullgris blant blomster i solen', en: 'A woolly pig among sunlit flowers', width: 1333, height: 2000 },
  { src: '/mangalitsa-winter-feeding.jpg', no: 'Vinterfôring av flokken', en: 'Winter feeding of the herd', width: 2000, height: 1500 },
  { src: '/mangalitsa-forest.jpg', no: 'Ullgris i skogskanten', en: 'A woolly pig at the forest edge', width: 901, height: 2000 },
  { src: '/mangalitsa-hug.jpg', no: 'En god klem på gården', en: 'A good hug on the farm', width: 1125, height: 1500 },
  { src: '/mangalitsa-snow.jpg', no: 'Ute i snøen om vinteren', en: 'Out in the snow in winter', width: 1500, height: 2000 },
  { src: '/mangalitsa-sleeping.jpg', no: 'En lur i vårgresset', en: 'A nap in the spring grass', width: 1333, height: 2000 },
  { src: '/mangalitsa-snout.jpg', no: 'Snuten helt tett på', en: 'The snout right up close', width: 1500, height: 2000 },
  { src: '/mangalitsa-birthday.jpg', no: 'Bursdag på gården', en: 'A birthday on the farm', width: 1200, height: 1600 },
]

const videos = [
  { src: '/mangalitsa-herd-2026.mp4', poster: '/mangalitsa-flowers.jpg', no: 'Flokken en sommerdag', en: 'The herd on a summer day', captionNo: 'Juli 2026. Originalvideo fra gårdsalbumet.', captionEn: 'July 2026. Original footage from the farm album.' },
  { src: '/mangalitsa-winter-2026.mp4', poster: '/mangalitsa-snow.jpg', no: 'Ullgrisene om vinteren', en: 'The pigs in winter', captionNo: 'Mars 2026. Avspilling starter når du trykker på play.', captionEn: 'March 2026. Press play to start.' },
  { src: '/mangalitsa-spring-2026.mp4', poster: '/mangalitsa-forest.jpg', no: 'Vårstemning på gården', en: 'Spring on the farm', captionNo: 'Mars 2026. Originalvideo fra gårdsalbumet.', captionEn: 'March 2026. Original footage from the farm album.' },
  { src: '/mangalitsa-autumn-2026.mp4', poster: '/mangalitsa-hug.jpg', no: 'Ettersommer ute på gården', en: 'Late summer outdoors', captionNo: 'September 2026. Avspilling starter når du trykker på play.', captionEn: 'September 2026. Press play to start.' },
]

export function FarmGallery() {
  const { lang } = useLanguage()
  const no = lang === 'no'
  const [index, setIndex] = useState(0)
  const active = photos[index]
  useEffect(() => {
    const openFilm = () => {
      if (window.location.hash !== '#gardsfilm') return
      const film = document.getElementById('gardsfilm') as HTMLDetailsElement | null
      if (film) { film.open = true; film.scrollIntoView({ block: 'center' }) }
    }
    openFilm()
    window.addEventListener('hashchange', openFilm)
    return () => window.removeEventListener('hashchange', openFilm)
  }, [])
  return <div className={styles.farmGallery}>
    <div className={styles.galleryHeading}><div><small>{no ? 'Ekte bilder fra gårdsalbumet' : 'Real photos from our farm album'}</small><h2>{no ? 'MØT ULLGRISENE.' : 'MEET THE PIGS.'}</h2></div><a href="#bokser">{no ? 'Se boksene' : 'See the boxes'}<ArrowRight size={18} /></a></div>
    <figure className={styles.galleryLead}>
      <Image key={active.src} src={active.src} alt={no ? active.no : active.en} width={active.width} height={active.height} sizes="(max-width: 767px) 100vw, 85vw" />
      <figcaption aria-live="polite"><span>{no ? active.no : active.en}</span><span>{index + 1} / {photos.length}</span></figcaption>
      <div className={styles.galleryArrows}><button aria-label={no ? 'Forrige gårdsbilde' : 'Previous farm photo'} onClick={() => setIndex(value => (value + photos.length - 1) % photos.length)}><ArrowLeft size={20} /></button><button aria-label={no ? 'Neste gårdsbilde' : 'Next farm photo'} onClick={() => setIndex(value => (value + 1) % photos.length)}><ArrowRight size={20} /></button></div>
    </figure>
    <div className={styles.galleryThumbnails} role="group" aria-label={no ? 'Velg gårdsbilde' : 'Choose a farm photo'}>{photos.map((photo, i) => <button key={photo.src} aria-pressed={index === i} aria-label={no ? photo.no : photo.en} onClick={() => setIndex(i)}><Image src={photo.src} alt="" width={photo.width} height={photo.height} sizes="(max-width: 767px) 22vw, 20vw" /><span>{no ? photo.no : photo.en}</span></button>)}</div>
    <div className={styles.galleryVideos}>{videos.map(video => <details key={video.src} id={video === videos[0] ? 'gardsfilm' : undefined} className={styles.farmVideo}><summary>{no ? `Video: ${video.no}` : `Video: ${video.en}`}<ChevronDown size={18} /></summary><video className={styles.portraitVideo} controls playsInline preload="none" poster={video.poster} src={video.src} aria-label={no ? video.no : video.en} /><p>{no ? video.captionNo : video.captionEn}</p></details>)}</div>
  </div>
}
