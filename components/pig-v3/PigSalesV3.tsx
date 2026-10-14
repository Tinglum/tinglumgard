'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChefHat, ChevronDown, ChevronLeft, ChevronRight, FlameKindling, Menu, Minus, Plus, TreePine, Users, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PIG_CUT_POLYGONS } from '@/lib/constants/pig-diagram'
import { getDefaultExtraQuantity } from '@/lib/extras/fixedQuantities'
import { displayCutName } from '@/lib/utils/text'
import styles from './pig-sales-v3.module.css'
import { FarmGallery } from './FarmGallery'

type Part = 'nakke' | 'svinebog' | 'kotelettkam' | 'ribbeside' | 'skinke' | 'knoke'
type Content = { content_name_no: string; content_name_en: string; part_key?: string; cut_id?: string; cut_slug?: string; target_weight_kg?: number | null }
type Preset = { id: string; slug: string; name_no: string; name_en: string; target_weight_kg: number; price_nok: number; contents?: Content[] }
type Extra = { id: string; slug: string; name_no: string; name_en: string; part_key?: string; cut_id?: string; cut_slug?: string; price_nok: number; pricing_type: string; stock_quantity: number | null; product_type?: string; default_quantity?: number; fixed_quantity?: number; description_no?: string; description_en?: string }
const sameCut = (item: Content, extra: Extra) => Boolean((item.cut_id && item.cut_id === extra.cut_id) || (item.cut_slug && item.cut_slug === extra.cut_slug))
type Inventory = { boxesRemaining: number; isSoldOut: boolean }

const boxNotes: Record<string, { no: string; en: string; image: string }> = {
  familieboks: { no: 'Til hverdager, helger og en velfylt fryser.', en: 'For weekdays, weekends and a well-stocked freezer.', image: '/recipes/bog-langtid.jpg' },
  julespesial: { no: 'Ribba og resten av de gode julemiddagene.', en: 'Pork belly and all those Christmas dinners.', image: '/recipes/norsk-ribbe-uten-svor.png' },
  'bbq-steakhouse': { no: 'For deg som helst fyrer opp grillen.', en: 'For those who would rather fire up the grill.', image: '/recipes/tomahawk-chimichurri.jpg' },
  'premium-cuts': { no: 'Små, ettertraktede stykker. Store muligheter.', en: 'Rare, sought-after cuts. Plenty of possibilities.', image: '/recipes/secreto-plancha.jpg' },
}
const cuts: Record<Part, { no: string; en: string; textNo: string; textEn: string; methodNo: string; methodEn: string; recipe: string; image: string }> = {
  nakke: { no: 'Nakke', en: 'Collar', textNo: 'God marmorering og mye smak. Nakkekam kan stekes hel, grilles i skiver eller spekes til coppa.', textEn: 'Rich marbling and plenty of flavour. Roast it whole, grill thick slices or cure it as coppa.', methodNo: 'Grill eller langtidsstek', methodEn: 'Grill or slow-roast', recipe: 'neck-steak', image: '/recipes/neck-steak.jpg' },
  svinebog: { no: 'Bog', en: 'Shoulder', textNo: 'Gi bogen tid, så får du mørt kjøtt til gryter, pulled pork og carnitas. En del som gjør mye ut av seg.', textEn: 'Give shoulder time and it rewards you with tender stews, pulled pork and carnitas.', methodNo: 'Lav varme, god tid', methodEn: 'Low heat, plenty of time', recipe: 'bog-carnitas-lime', image: '/recipes/bog-carnitas-lime.jpg' },
  kotelettkam: { no: 'Kotelettkam', en: 'Loin', textNo: 'Koteletter og ytrefilet med en fin fettkant. Brun kjøttet godt, og la det hvile før du skjærer.', textEn: 'Chops and loin with a generous fat cap. Sear well and rest before slicing.', methodNo: 'Panne eller grill', methodEn: 'Pan or grill', recipe: 'koteletter-harissa-yoghurt', image: '/recipes/koteletter-harissa-yoghurt.jpg' },
  ribbeside: { no: 'Ribbeside', en: 'Belly', textNo: 'Ribba leveres uten svor fordi ullgrisen flås. Mangalitsa har godt med fett som gir saftig kjøtt og fyldig smak. Her begynner ribbemiddagen, baconet og porchettaen.', textEn: 'The belly comes without skin because the woolly pig is skinned. Mangalitsa fat keeps the meat juicy and gives it a rich flavour. This is where pork belly, bacon and porchetta begin.', methodNo: 'Langsteking for saftig kjøtt', methodEn: 'Slow-roast for juicy meat', recipe: 'ullgris-ribbe-langstekt', image: '/recipes/norsk-ribbe-uten-svor.png' },
  skinke: { no: 'Skinke', en: 'Ham', textNo: 'Store stykker til stek, speking og middager til mange. Skinka har magrere kjøtt enn nakke og side.', textEn: 'Generous cuts for roasting, curing and feeding a crowd. Leaner than collar and belly.', methodNo: 'Stek hel eller spek', methodEn: 'Roast whole or cure', recipe: 'cure-ham', image: '/recipes/cure-ham.jpg' },
  knoke: { no: 'Knoke', en: 'Hock', textNo: 'Kraft, kjøtt og fylde til supper og gryter. La knoken småkoke til kjøttet slipper beinet.', textEn: 'Stock, tender meat and depth for soups and stews. Simmer until the meat leaves the bone.', methodNo: 'Småkok til den er mør', methodEn: 'Simmer until tender', recipe: 'knoke-kraft', image: '/recipes/knoke-kraft.jpg' },
}
const polygonPart: Record<number, Part> = { 3: 'nakke', 8: 'svinebog', 5: 'kotelettkam', 7: 'ribbeside', 9: 'skinke', 10: 'knoke' }
const order = ['familieboks', 'julespesial', 'bbq-steakhouse', 'premium-cuts']
const boxIcons: Record<string, typeof Users> = { familieboks: Users, julespesial: TreePine, 'bbq-steakhouse': FlameKindling, 'premium-cuts': ChefHat }
const heroMeals = [
  { image: '/recipes/norsk-ribbe-uten-svor.png', recipe: 'ullgris-ribbe-langstekt', occasionNo: 'Julemiddag?', occasionEn: 'Christmas dinner?', titleNo: 'Start med ribba.', titleEn: 'Start with the belly.', altNo: 'Langstekt ullgrisribbe, klar til servering', altEn: 'Slow-roasted pork belly, ready to serve' },
  { image: '/recipes/tomahawk-chimichurri.jpg', recipe: 'tomahawk-chimichurri', occasionNo: 'En kveld ved grillen?', occasionEn: 'An evening by the grill?', titleNo: 'Gi koteletten plass.', titleEn: 'Make room for the chop.', altNo: 'Grillet tomahawk-kotelett med chimichurri', altEn: 'Grilled tomahawk pork chop with chimichurri' },
  { image: '/recipes/bog-langtid.jpg', recipe: 'bog-langtid', occasionNo: 'Middag til mange?', occasionEn: 'Feeding a crowd?', titleNo: 'La bogen ta seg tid.', titleEn: 'Give shoulder time.', altNo: 'Langstekt svinebog med grønnsaker', altEn: 'Slow-roasted pork shoulder with vegetables' },
]

export function PigSalesV3({ standalone = true }: { standalone?: boolean }) {
  const { lang, setLang } = useLanguage()
  const no = lang === 'no'
  const [presets, setPresets] = useState<Preset[]>([])
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [selectedSlug, setSelectedSlug] = useState('familieboks')
  const [part, setPart] = useState<Part>('ribbeside')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [inventoryError, setInventoryError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [compare, setCompare] = useState(false)
  const [mealIndex, setMealIndex] = useState(0)
  const [extras, setExtras] = useState<Extra[]>([])
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])
  const [extrasError, setExtrasError] = useState(false)
  const [showOrderBar, setShowOrderBar] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const root = pageRef.current
    if (!root) return
    const hero = root.querySelector('#v3-hero')
    const boxSection = root.querySelector('#bokser')
    const footer = root.querySelector('footer') || root.closest('.farm-site')?.querySelector('footer')
    if (!hero || !boxSection || !footer) return
    const visibility = new Map<Element, boolean>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting))
      setShowOrderBar(visibility.get(hero) === false && visibility.get(boxSection) === false && visibility.get(footer) === false)
    }, { rootMargin: '-86px 0px 0px 0px' })
    ;[hero, boxSection, footer].forEach(element => observer.observe(element))

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set<Animation>()
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        if (!motionPreference.matches) {
          const animation = entry.target.animate([
            { transform: 'translateY(24px)', opacity: 0.65 },
            { transform: 'translateY(0)', opacity: 1 },
          ], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' })
          animations.add(animation)
          animation.onfinish = () => animations.delete(animation)
        }
        revealObserver.unobserve(entry.target)
      })
    }, { threshold: 0.12 })
    root.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element))
    const stopAnimations = () => {
      if (motionPreference.matches) animations.forEach(animation => animation.cancel())
    }
    motionPreference.addEventListener('change', stopAnimations)
    return () => {
      observer.disconnect()
      revealObserver.disconnect()
      animations.forEach(animation => animation.cancel())
      motionPreference.removeEventListener('change', stopAnimations)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const closeOnDesktop = () => { if (window.innerWidth >= 768) setMenuOpen(false) }
    const closeOutsideMenu = (event: PointerEvent) => {
      if (event.target instanceof Node && !pageRef.current?.querySelector('header')?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutsideMenu)
    window.addEventListener('resize', closeOnDesktop)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutsideMenu)
      window.removeEventListener('resize', closeOnDesktop)
    }
  }, [menuOpen])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    setInventoryError(false)
    setExtrasError(false)
    async function load() {
      const read = async (url: string) => {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load catalogue')
        return response.json()
      }
      const [catalogue, stock, products] = await Promise.allSettled([read('/api/mangalitsa/presets'), read('/api/inventory'), read('/api/extras')])
      if (controller.signal.aborted) return
      if (catalogue.status === 'fulfilled' && Array.isArray(catalogue.value.presets)) {
        const boxes: Preset[] = catalogue.value.presets
        boxes.sort((a, b) => (order.indexOf(a.slug) < 0 ? 99 : order.indexOf(a.slug)) - (order.indexOf(b.slug) < 0 ? 99 : order.indexOf(b.slug)))
        setPresets(boxes)
        setSelectedSlug(current => boxes.some(box => box.slug === current) ? current : boxes[0]?.slug || '')
      } else setError(true)
      if (stock.status === 'fulfilled' && typeof stock.value.isSoldOut === 'boolean') setInventory(stock.value)
      else setInventoryError(true)
      if (products.status === 'fulfilled' && Array.isArray(products.value.extras)) setExtras(products.value.extras.filter((extra: Extra) => (!extra.product_type || extra.product_type === 'pig_box') && !/\b(kje|geit|goat)\b/i.test(extra.name_no + ' ' + extra.name_en)))
      else setExtrasError(true)
      setLoading(false)
    }
    void load()
    return () => controller.abort()
  }, [attempt])

  const t = (norwegian: string, english: string) => no ? norwegian : english
  const money = (amount: number) => new Intl.NumberFormat(no ? 'nb-NO' : 'en-GB', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(amount)
  const selected = presets.find(box => box.slug === selectedSlug)
  const name = (box: Preset) => no ? box.name_no : box.name_en
  const contentName = (item: Content) => displayCutName(no ? item.content_name_no : item.content_name_en, lang)
  const chosenExtras = extras.filter(extra => selectedExtras.includes(extra.slug) && !selected?.contents?.some(item => sameCut(item, extra)) && (typeof extra.stock_quantity !== 'number' || extra.stock_quantity > 0))
  const extrasTotal = chosenExtras.reduce((total, extra) => total + extra.price_nok * getDefaultExtraQuantity(extra), 0)
  const total = (selected?.price_nok || 0) + extrasTotal
  const href = selected ? `/bestill?preset=${encodeURIComponent(selected.slug)}${chosenExtras.map(extra => `&extra=${encodeURIComponent(extra.slug)}`).join('')}` : '/bestill'
  const toggleExtra = (slug: string) => setSelectedExtras(current => current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug])
  const soldOut = inventory?.isSoldOut === true
  const activeCut = cuts[part]
  const matchingBoxes = presets.filter(box => box.contents?.some(item => item.part_key === part))
  const contentsForCut = selected?.contents?.filter(item => item.part_key === part) || []
  const includedParts = new Set(selected?.contents?.map(item => item.part_key).filter(Boolean))
  const productsForPart = extras.filter(extra => extra.part_key === part)
  const boxOnlyCuts = presets.flatMap(box => box.contents || []).filter((item, index, items) =>
    item.part_key === part &&
    !productsForPart.some(extra => sameCut(item, extra)) &&
    items.findIndex(other => (other.cut_id || other.cut_slug || other.content_name_no) === (item.cut_id || item.cut_slug || item.content_name_no)) === index)
  const meal = heroMeals[mealIndex]
  const cta = t('Bestill din boks nå', 'Order your box now')
  const faqs = [
    [t('Hvordan betaler jeg?', 'How do I pay?'), t('Du betaler 50 % når du bestiller. Resten betales før levering. Beløp og betalingsvalg vises i bestillingen.', 'Pay 50% when you order, with the balance due before delivery. Amounts and payment options are shown at checkout.')],
    [t('Når og hvor får jeg boksen?', 'When and where do I get my box?'), t('Levering skjer i starten av desember. Du ser tilgjengelige leverings- og hentevalg, datoer og eventuelle kostnader i bestillingen.', 'Delivery is in early December. Available delivery and collection options, dates and charges are shown at checkout.')],
    [t('Kan jeg tilpasse boksen?', 'Can I customise my box?'), t('Hver boks har et grunninnhold. Tilgjengelige tillegg og valg vises når du bestiller. Vektene er omtrentlige og kan variere ved stykning.', 'Each box has a core selection. Available extras and choices are shown at checkout. Cut weights are approximate and can vary with butchery.')],
    [t('Hvor mye fryseplass trenger jeg?', 'How much freezer space do I need?'), t('Se på boksens totalvekt og plassen du har ledig. Pakkenes form og størrelsen på fryseskuffene varierer. Kontakt oss om du er usikker før du bestiller.', 'Check the total box weight against the space you have available. Pack shapes and freezer drawer sizes vary. Contact us before ordering if you are unsure.')],
  ]

  return (
    <div ref={pageRef} className={styles.page}>
      <a href="#bokser" className={styles.skipLink}>{t('Gå til boksene', 'Skip to the boxes')}</a>
      {standalone && <header className={styles.header}>
        <Link href="/v3" className={styles.logo} aria-label="Tinglum Gård"><span>TINGLUM<span className={styles.logoSecond}>GÅRD<span className={styles.logoDot}>.</span></span></span></Link>
        <nav aria-label={t('Hovedmeny', 'Main navigation')}><a href="#bokser">{t('Boksene', 'The boxes')}</a><a href="#stykningsdeler">{t('Stykningsdelene', 'The cuts')}</a><a href="#sporsmal">{t('Praktisk', 'Good to know')}</a></nav>
        <div className={styles.headerActions}><button onClick={() => setLang(no ? 'en' : 'no')} aria-label={t('Switch to English', 'Bytt til norsk')}>{no ? 'EN' : 'NO'}</button><Link href="/min-side" aria-label={t('Min side', 'My account')}>{t('Min side', 'My account')}<ArrowUpRight size={15} /></Link><a className={styles.navCta} href="#bokser" onClick={() => setMenuOpen(false)}>{t('Velg boks', 'Choose a box')}<ArrowRight size={16} /></a><button ref={menuButtonRef} className={styles.menuButton} aria-expanded={menuOpen} aria-controls="v3-mobile-menu" aria-label={menuOpen ? t('Lukk meny', 'Close menu') : t('Åpne meny', 'Open menu')} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
        <nav id="v3-mobile-menu" hidden={!menuOpen} className={styles.mobileMenu} aria-label={t('Mobilmeny', 'Mobile navigation')}><a href="#bokser" onClick={() => setMenuOpen(false)}>{t('Boksene', 'The boxes')}<ArrowUpRight size={18} /></a><a href="#stykningsdeler" onClick={() => setMenuOpen(false)}>{t('Stykningsdelene', 'The cuts')}<ArrowUpRight size={18} /></a><a href="#sporsmal" onClick={() => setMenuOpen(false)}>{t('Praktisk', 'Good to know')}<ArrowUpRight size={18} /></a><Link href="/min-side" onClick={() => setMenuOpen(false)}>{t('Min side', 'My account')}<ArrowUpRight size={18} /></Link></nav>
      </header>}

      <section id="v3-hero" className={styles.hero} aria-labelledby="v3-title">
        <div className={styles.heroCopy}>
          <h1 id="v3-title">{t('ULLGRIS', 'MANGALITSA')}<br />{t('TIL JUL.', 'FOR CHRISTMAS.')}<br /><span>{t('DIN BOKS.', 'YOUR BOX.')}</span></h1>
          <p>{t('Mangalitsa fra Namdalseid til julemiddagen og dagene rundt. Velg boksen som passer deg. Levering i starten av desember.', 'Mangalitsa from Namdalseid for Christmas dinner and beyond. Choose your box. Delivery in early December.')}</p>
          <a href="#bokser" className={styles.primary}>{cta}<ArrowUpRight size={23} /></a>
          {selected && <div className={styles.heroReceipt}><strong>{name(selected)} · {money(Math.floor(selected.price_nok / 2))} {t('betales nå', 'due now')}</strong><small>{t('50 % av boksprisen. Tillegg og eventuell levering betales med resten.', '50% of the box price. Extras and any delivery charge are paid with the balance.')}</small></div>}
          <a href="#livet-pa-garden" className={styles.textLink}>{t('Møt ullgrisene · bilder og video', 'Meet the pigs · photos and video')}<ArrowDown size={16} /></a>
          <a href="#stykningsdeler" className={styles.textLink}>{t('Bli kjent med stykningsdelene', 'Get to know the cuts')}<ArrowDown size={16} /></a>
        </div>
        <div className={styles.heroPhoto}>
          <Image key={meal.image} src={meal.image} fill priority sizes="(max-width: 767px) 100vw, 56vw" alt={no ? meal.altNo : meal.altEn} />
          <div className={styles.photoCaption} aria-live="polite"><span>{no ? meal.occasionNo : meal.occasionEn}</span><Link href={`/oppskrifter/${meal.recipe}`}>{no ? meal.titleNo : meal.titleEn}<ArrowUpRight size={20} /></Link></div>
          <div className={styles.mealControls} role="group" aria-label={t('Middagsinspirasjon', 'Dinner inspiration')}><button aria-label={t('Forrige middag', 'Previous dinner')} onClick={() => setMealIndex(index => (index + heroMeals.length - 1) % heroMeals.length)}><ChevronLeft size={18} /></button><span aria-hidden="true">{String(mealIndex + 1).padStart(2, '0')} / 03</span><button aria-label={t('Neste middag', 'Next dinner')} onClick={() => setMealIndex(index => (index + 1) % heroMeals.length)}><ChevronRight size={18} /></button></div>
          <div className={styles.stamp} aria-label={t('Mangalitsa fra Tinglum Gård, Namdalseid', 'Mangalitsa from Tinglum Farm, Namdalseid')}><span>NAMDALSEID</span><strong>ULL<br />GRIS</strong><span>MANGALITSA</span></div>
        </div>
      </section>

      <div className={styles.deliveryStrip}><span>{t('Fra Tinglum Gård', 'From Tinglum Farm')}</span><span>{t('Levering i starten av desember', 'Early December delivery')}</span><span>{t('50 % ved bestilling', '50% when ordering')}</span><a href="#bokser">{inventory ? soldOut ? t('Årets bokser er utsolgt', 'This year’s boxes are sold out') : t(`Ca. ${inventory.boxesRemaining} bokser igjen`, `Approx. ${inventory.boxesRemaining} boxes left`) : t('Se boksene', 'See the boxes')}<ArrowRight size={16} /></a></div>

      <section id="bokser" className={styles.boxSection} aria-labelledby="box-title">
        <div className={styles.boxHeading}><h2 id="box-title">{t('HVA HAR DU', 'WHAT ARE YOU')}<br /><span>{t('LYST PÅ?', 'IN THE MOOD FOR?')}</span></h2><p>{t('Hverdagsmat, julemiddag eller noe skikkelig godt på grillen. Finn din favoritt, og se akkurat hva du får.', 'Weeknight dinners, Christmas roasts or something special for the grill. Pick a favourite and see what is inside.')}</p></div>
        {loading ? <div className={styles.loading} role="status">{t('Henter årets bokser …', 'Loading this year’s boxes …')}</div> : error ? <div className={styles.error} role="alert"><p>{t('Vi fikk ikke hentet boksene. Prøv igjen.', 'We could not load the boxes. Please try again.')}</p><button className={styles.primary} onClick={() => setAttempt(value => value + 1)}>{t('Prøv igjen', 'Try again')}<ArrowRight size={18} /></button></div> : !presets.length ? <p className={styles.error}>{t('Det er ingen bokser tilgjengelig akkurat nå.', 'No boxes are available right now.')}</p> : <>
          <div id="v3-box-picker" tabIndex={-1} className={styles.boxTabs} role="group" aria-label={t('Velg kjøttboks', 'Choose a meat box')}>{presets.map(box => {
            const Icon = boxIcons[box.slug] || ChefHat
            return <button key={box.id} aria-pressed={selectedSlug === box.slug} className={selectedSlug === box.slug ? styles.selectedTab : ''} onClick={() => setSelectedSlug(box.slug)}><div className={styles.tabIcon} aria-hidden="true"><Icon strokeWidth={1.5} /></div><span>{name(box)}</span><small>{box.target_weight_kg} kg / {money(box.price_nok)}</small><em className={styles.boxAudience}>{boxNotes[box.slug] ? no ? boxNotes[box.slug].no : boxNotes[box.slug].en : ''} </em>{selectedSlug === box.slug ? <Check size={19} /> : <ArrowUpRight size={19} />}</button>
          })}</div>
          {selected && <div className={styles.boxDetail}>
            <div className={styles.boxPhoto}><Image key={selected.slug} src={boxNotes[selected.slug]?.image || '/recipes/bog-langtid.jpg'} fill priority={selected.slug === 'julespesial'} sizes="(max-width: 767px) 100vw, 44vw" alt={t(`Matinspirasjon til ${name(selected)}`, `Cooking inspiration for ${name(selected)}`)} /><span className={styles.weightTag}>{selected.target_weight_kg}<small>kg</small></span><span className={styles.boxPhotoNote}>{t('Et av måltidene du kan lage', 'One of the meals you could make')}</span></div>
            <div className={styles.boxInfo}>
              <div className={styles.boxTitle}><h3 aria-live="polite">{name(selected)}</h3><p>{boxNotes[selected.slug] ? no ? boxNotes[selected.slug].no : boxNotes[selected.slug].en : t('Ullgris fra Tinglum Gård.', 'Mangalitsa from Tinglum Farm.')}</p></div>
              {selected.contents?.some(item => item.part_key === 'ribbeside') && <div className={styles.skinlessNote}><strong>{t('Ribba er uten svor', 'The belly comes without skin')}</strong><p>{t('Ullgrisen flås. Fettmarmoreringen gir saftig kjøtt og fyldig smak, men du får ikke sprø svor.', 'Our woolly pigs are skinned. Rich marbling gives juicy meat and full flavour, but there is no crackling.')}</p></div>}
              <div className={styles.contentsHeading}><strong>{t('Dette ligger i boksen', 'Inside your box')}</strong><span>{t('Trykk på et stykke for å lære mer', 'Choose a cut to learn more')}</span></div>
              <ul className={styles.contents}>{selected.contents?.map((item, index) => <li key={`${item.content_name_no}-${index}`}>{item.part_key && item.part_key in cuts ? <a href="#stykningsdeler" onClick={() => { setPart(item.part_key as Part) }}><span>{contentName(item)}</span><ArrowUpRight size={13} /></a> : <span>{contentName(item)}</span>}<small>{item.target_weight_kg ? `${item.target_weight_kg.toLocaleString(no ? 'nb-NO' : 'en-GB')} kg` : ''}</small></li>)}</ul>
              <small className={styles.weightNote}>{t('Omtrentlige vekter. Endelig innhold og leveringsvalg vises i bestillingen.', 'Approximate weights. Final contents and delivery options are shown at checkout.')}</small>
              <div className={styles.priceLine}><div><small>{t('Bokspris', 'Box price')}</small><strong>{money(selected.price_nok)}</strong></div><p>{money(selected.price_nok / selected.target_weight_kg)} / kg<br /><span>{t('Basert på boksens omtrentlige totalvekt.', 'Based on the approximate total box weight.')}</span></p></div>
              <div className={styles.paymentSplit}><span><small>{t('50 % ved bestilling', '50% when ordering')}</small><strong>{money(Math.floor(selected.price_nok / 2))}</strong></span><span><small>{t('Resten før levering', 'Balance before delivery')}</small><strong>{money(selected.price_nok - Math.floor(selected.price_nok / 2))}</strong></span></div>
              {soldOut ? <button disabled className={styles.primary}>{t('Utsolgt', 'Sold out')}</button> : <Link href={href} className={styles.primary}>{cta}<ArrowUpRight size={22} /></Link>}
              <p className={styles.checkoutNote}><Check size={13} />{t('Leveringsvalg og eventuell frakt vises før betaling.', 'Delivery options and any shipping charge are shown before payment.')}</p>
              {inventoryError && <p className={styles.weightNote}>{t('Lagerstatus kunne ikke hentes. Tilgjengelighet bekreftes i bestillingen.', 'Stock status could not be loaded. Availability is confirmed at checkout.')}</p>}
            </div>
          </div>}
          <button className={styles.compareToggle} aria-expanded={compare} aria-controls="v3-comparison" onClick={() => setCompare(value => !value)}>{compare ? <Minus size={18} /> : <Plus size={18} />}{t('Sammenlign alle boksene', 'Compare all boxes')}</button>
          <div id="v3-comparison" hidden={!compare} className={styles.comparison}><table><caption>{t('Vekt, pris og forskudd. Kiloprisen er basert på omtrentlige vekter.', 'Weight, price and deposit. Price per kg is based on approximate weights.')}</caption><thead><tr><th scope="col">{t('Boks', 'Box')}</th><th scope="col">{t('Vekt', 'Weight')}</th><th scope="col">{t('Pris', 'Price')}</th><th scope="col">{t('Per kg', 'Per kg')}</th><th scope="col">{t('Betales nå', 'Due now')}</th></tr></thead><tbody>{presets.map(box => <tr key={box.id} className={box.slug === selectedSlug ? styles.comparisonSelected : ''}><th scope="row"><button onClick={() => { setSelectedSlug(box.slug); setCompare(false); document.getElementById('v3-box-picker')?.focus({ preventScroll: true }) }}>{name(box)}<ArrowUpRight size={15} /></button></th><td>{box.target_weight_kg} kg</td><td>{money(box.price_nok)}</td><td>{money(box.price_nok / box.target_weight_kg)}</td><td>{money(Math.floor(box.price_nok / 2))}</td></tr>)}</tbody></table></div>
        </>}
      </section>

      <section id="stykningsdeler" className={styles.explorer} aria-labelledby="cut-title">
        <div className={styles.explorerHeading}><h2 id="cut-title">{t('VELG DITT STYKKE.', 'CHOOSE YOUR CUT.')}<br /><span>{t('SE HVA DU FÅR.', 'SEE WHAT YOU GET.')}</span></h2><p>{t('Utforsk stykningsdelene du kan kjøpe. Hakene viser nøyaktig hvilke stykker som følger med boksen du velger. Andre stykker kan legges til i bestillingen.', 'Explore the cuts you can buy. Checkmarks show exactly which cuts come with your selected box. Other cuts can be added at checkout.')}</p></div>
        <div className={styles.explorerBody}>
          <div className={styles.diagramColumn}>
            {!!presets.length && <div className={styles.explorerControls}><label htmlFor="v3-explorer-box">{t('Utforsk boksen', 'Explore this box')}<select id="v3-explorer-box" value={selectedSlug} onChange={event => setSelectedSlug(event.target.value)}>{presets.map(box => <option key={box.id} value={box.slug}>{name(box)}</option>)}</select></label><span className={styles.boxCutCount}><Check size={16} />{t(`${selected?.contents?.length || 0} stykker i boksen`, `${selected?.contents?.length || 0} cuts in this box`)}</span></div>}
            <div className={styles.diagram}>
              <Image src="/pig-diagram3.png" alt={t('Illustrert stykningskart av Mangalitsa ullgris', 'Illustrated Mangalitsa pork butcher chart')} fill sizes="(max-width: 767px) 100vw, 62vw" />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={t('Velg stykningsdel', 'Choose a cut')} className={styles.hitMap}>{PIG_CUT_POLYGONS.map((polygon, index) => {
                const key = polygonPart[polygon.id]
                const cutName = no ? cuts[key].no : cuts[key].en
                return <polygon key={`${polygon.id}-${index}`} points={polygon.points} role="button" tabIndex={0} aria-pressed={part === key} aria-label={cutName} className={`${includedParts.has(key) ? styles.includedPart : ''} ${part === key ? styles.activePart : ''}`} onClick={() => setPart(key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPart(key) } }}><title>{`${cutName}${includedParts.has(key) ? `: ${t('i valgt boks', 'in selected box')}` : ''}`}</title></polygon>
              })}</svg>
            </div>
            <div className={styles.cutButtons} role="group" aria-label={t('Stykningsdeler', 'Pork cuts')}>{(Object.keys(cuts) as Part[]).map(key => <button key={key} aria-pressed={part === key} onClick={() => setPart(key)} className={part === key ? styles.selectedCut : ''}>{no ? cuts[key].no : cuts[key].en}{includedParts.has(key) && <Check size={11} aria-label={t('I valgt boks', 'In selected box')} />}</button>)}</div>
            <div className={styles.diagramLegend}>{selected && <span><i />{t('I valgt boks', 'In selected box')}</span>}<span><i className={styles.activeLegend} />{t('Delen du utforsker', 'The cut you are exploring')}</span></div>
          </div>
          <aside key={part} className={styles.cutDetail}>
            <div className={styles.cutText}>
              <small className={styles.catalogueEyebrow}>{t('Fra denne delen av grisen', 'From this part of the pig')}</small>
              <h3>{no ? activeCut.no : activeCut.en}</h3>
              <p>{t('Stykker i boksen er inkludert i boksprisen. Tillegg prises separat.', 'Box cuts are included in the box price. Extras are priced separately.')}</p>
              {loading && <p role="status">{t('Henter stykningsdelene …', 'Loading cuts …')}</p>}
              {extrasError && <div role="alert"><p>{t('Tilleggene kunne ikke hentes. Boksinnholdet vises nedenfor.', 'Extras could not be loaded. Box contents are shown below.')}</p><button onClick={() => setAttempt(value => value + 1)}>{t('Prøv igjen', 'Try again')}</button></div>}
              <ul className={styles.productCuts}>
                {boxOnlyCuts.map((item, index) => {
                  const matches = (other: Content) => (other.cut_id || other.cut_slug || other.content_name_no) === (item.cut_id || item.cut_slug || item.content_name_no)
                  const included = contentsForCut.find(matches)
                  const boxes = presets.filter(box => box.contents?.some(matches))
                  return <li key={`box-${index}`} className={included ? styles.includedProduct : ''}><div className={styles.productCutHeading}><h4>{contentName(item)}</h4>{included && <span className={styles.includedBadge}><Check size={13} />{t('I boksen', 'Included')}</span>}</div>{included ? <small>{included.target_weight_kg ? `Ca. ${included.target_weight_kg.toLocaleString(no ? 'nb-NO' : 'en-GB')} kg · ` : ''}{t('Inkludert i boksprisen', 'Included in box price')}</small> : <div className={styles.boxProductOptions}><small>{t('Kjøpes i', 'Available in')}</small>{boxes.map(box => <button key={box.id} onClick={() => setSelectedSlug(box.slug)}>{name(box)}<ArrowRight size={13} /></button>)}</div>}</li>
                })}
                {productsForPart.map(extra => {
                  const included = contentsForCut.find(item => sameCut(item, extra))
                  const unavailable = soldOut || (typeof extra.stock_quantity === 'number' && extra.stock_quantity <= 0)
                  return <li key={extra.id} className={included ? styles.includedProduct : ''}>
                    <div className={styles.productCutHeading}><h4>{displayCutName(no ? extra.name_no : extra.name_en, lang)}</h4>{included && <span className={styles.includedBadge}><Check size={13} />{t('I boksen', 'Included')}</span>}</div>
                    {(no ? extra.description_no : extra.description_en) && <details className={styles.productDescription}><summary>{t('Om stykket', 'About this cut')}<ChevronDown size={14} /></summary><p>{no ? extra.description_no : extra.description_en}</p></details>}
                    <div className={styles.productCutAction}>{included ? <small>{included.target_weight_kg ? `Ca. ${included.target_weight_kg.toLocaleString(no ? 'nb-NO' : 'en-GB')} kg · ` : ''}{t('Inkludert i boksprisen', 'Included in box price')}</small> : <><strong>{money(extra.price_nok)}<small> / {extra.pricing_type === 'per_kg' ? 'kg' : t('enhet', 'unit')}</small></strong>{unavailable ? <span>{t('Utsolgt', 'Sold out')}</span> : <button aria-pressed={selectedExtras.includes(extra.slug)} aria-label={t(`${selectedExtras.includes(extra.slug) ? 'Fjern' : 'Legg til'} ${extra.name_no}`, `${selectedExtras.includes(extra.slug) ? 'Remove' : 'Add'} ${extra.name_en}`)} onClick={() => toggleExtra(extra.slug)}>{selectedExtras.includes(extra.slug) ? <><Check size={15} />{t('Valgt', 'Selected')}</> : <>{t('Legg til', 'Add extra')}<Plus size={15} /></>}</button>}</>}</div>
                  </li>
                })}
              </ul>
              {!loading && !extrasError && !productsForPart.length && !boxOnlyCuts.length && <p>{t('Ingen stykker fra denne delen er tilgjengelige som tillegg eller i valgt boks akkurat nå.', 'No cuts from this part are currently listed as extras or in your selected box.')}</p>}
              {selected && <div className={styles.cutIncluded}><small>{t('Valgt boks', 'Selected box')}</small><b>{name(selected)}</b><a href="#din-boks">{t('Se boks og valgte tillegg', 'View box and selected extras')} ({chosenExtras.length})<ArrowDown size={17} /></a></div>}
              {!!matchingBoxes.length && <div className={styles.matching}><small>{t('Denne delen finnes også i', 'This part is also found in')}</small>{matchingBoxes.map(box => <a href="#bokser" key={box.id} onClick={() => setSelectedSlug(box.slug)}>{name(box)}<ArrowUpRight size={15} /></a>)}</div>}
              <details className={styles.cutCooking}><summary>{t('Slik bruker du kjøttet', 'How to cook this cut')}<ChevronDown size={16} /></summary><p>{no ? activeCut.textNo : activeCut.textEn}</p><Link href={`/oppskrifter/${activeCut.recipe}`}>{t('Se oppskriften', 'See the recipe')}<ArrowUpRight size={17} /></Link></details>
            </div>
          </aside>
        </div>
      </section>

      {selected && <section id="din-boks" className={styles.orderSummary} aria-labelledby="order-summary-title">
        <div><small>{t('Ditt valg', 'Your selection')}</small><h2 id="order-summary-title">{t('DIN BOKS. DINE TILLEGG.', 'YOUR BOX. YOUR EXTRAS.')}</h2><p>{t('Velg flere stykker i kartet over. Vi tar valgene med til bestillingen.', 'Choose more cuts in the chart above. We carry your choices into checkout.')}</p><a href="#stykningsdeler">{t('Utforsk flere stykker', 'Explore more cuts')}<ArrowUpRight size={18} /></a></div>
        <div className={styles.summaryReceipt}><div className={styles.summaryRow}><span><strong>{name(selected)}</strong><small>{selected.target_weight_kg} kg</small></span><b>{money(selected.price_nok)}</b></div>
          {chosenExtras.map(extra => <div key={extra.id} className={styles.summaryRow}><span><strong>{displayCutName(no ? extra.name_no : extra.name_en, lang)}</strong><small>{getDefaultExtraQuantity(extra).toLocaleString(no ? 'nb-NO' : 'en-GB')} {extra.pricing_type === 'per_kg' ? 'kg' : t('enhet', 'unit')}</small></span><b>{money(extra.price_nok * getDefaultExtraQuantity(extra))}</b><button aria-label={t(`Fjern ${extra.name_no}`, `Remove ${extra.name_en}`)} onClick={() => toggleExtra(extra.slug)}><X size={16} /></button></div>)}
          {!chosenExtras.length && <p>{t('Ingen tillegg valgt. Du kan også velge tillegg og endre mengder i bestillingen.', 'No extras selected. You can also select extras and change quantities at checkout.')}</p>}
          <div className={styles.summaryTotals} aria-live="polite"><span>{t('Boks og tillegg', 'Box and extras')}<strong>{money(total)}</strong></span><span>{t('Betales nå', 'Due now')}<strong>{money(Math.floor(selected.price_nok / 2))}</strong></span><span>{t('Rest før levering', 'Balance before delivery')}<strong>{money(total - Math.floor(selected.price_nok / 2))}</strong></span></div>
          <small>{t('Eventuell levering kommer i tillegg. Lagerstatus, mengder og endelig pris bekreftes i bestillingen.', 'Any delivery charge is additional. Stock, quantities and final price are confirmed at checkout.')}</small>
          {soldOut ? <button disabled className={styles.primary}>{t('Utsolgt', 'Sold out')}</button> : <Link href={href} className={styles.primary}>{t('Gå videre med mitt valg', 'Continue with my selection')}<ArrowUpRight size={20} /></Link>}
        </div>
      </section>}
      <section className={styles.deliveryOverview} aria-labelledby="delivery-overview-title"><div><small>{t('Levering i starten av desember', 'Early December delivery')}</small><h2 id="delivery-overview-title">{t('SLIK FÅR DU BOKSEN.', 'GETTING YOUR BOX.')}</h2></div><ul><li><strong>{t('Hent på gården', 'Collect at the farm')}</strong><span>Tinglemsvegen 91, Namdalseid</span></li><li><strong>{t('Henting i Trondheim', 'Collection in Trondheim')}</strong><span>Veita Mat AS, Jomfrugata 17B</span></li><li><strong>{t('Møtepunkt langs E6', 'E6 meeting point')}</strong><span>Stjørdal–Namsos</span></li></ul><p>{t('Tilgjengelige valg, eventuelle kostnader og detaljer bekreftes i bestillingen. Vi lover ikke levering utenfor disse områdene.', 'Available options, charges and details are confirmed at checkout. Delivery outside these areas is not promised.')}</p></section>

      <section id="livet-pa-garden" className={styles.story} aria-labelledby="story-title"><FarmGallery /><div className={styles.storyIdentity}><span>TINGLUM GÅRD</span><span>NAMDALSEID, TRØNDELAG</span></div><h2 id="story-title" data-reveal>{t('GOD MAT BEGYNNER', 'GOOD FOOD STARTS')}<br />{t('LENGE FØR MIDDAG.', 'LONG BEFORE DINNER.')}</h2><div className={styles.storyBottom}><p>{t('Mangalitsa er ullgrisen med krøllete pels og godt marmorert kjøtt. Fettet gir smak, og de forskjellige stykningsdelene gir deg mye å lage mat av.', 'Mangalitsa is the woolly pig with curly hair and richly marbled meat. Its fat adds flavour, and its varied cuts give you plenty to cook with.')}</p><p>{t('Vi setter sammen bokser som gjør det enkelt å bruke flere deler av dyret. Du kjenner opprinnelsen. Du ser innholdet. Og du velger middagen.', 'We put together boxes that make it easy to use more of the animal. You know the origin, you see the contents and you choose the dinner.')}</p><a href="#stykningsdeler">{t('Bli kjent med kjøttet', 'Get to know the meat')}<ArrowUpRight size={28} /></a></div></section>

      <section className={styles.kitchen} aria-labelledby="kitchen-title"><h2 id="kitchen-title" data-reveal>{t('FRA BOKS', 'FROM BOX')}<br /><span>{t('TIL BORD.', 'TO TABLE.')}</span></h2><div className={styles.recipeList}>{(['svinebog', 'kotelettkam', 'nakke'] as Part[]).map(key => <Link href={`/oppskrifter/${cuts[key].recipe}`} key={key} data-reveal><div className={styles.recipePhoto}><Image src={cuts[key].image} fill sizes="(max-width: 767px) 45vw, 17vw" alt={no ? cuts[key].no : cuts[key].en} /></div><div><small>{no ? cuts[key].methodNo : cuts[key].methodEn}</small><h3>{key === 'svinebog' ? t('Carnitas av bog', 'Shoulder carnitas') : key === 'kotelettkam' ? t('Koteletter med harissa', 'Harissa pork chops') : t('Nakkebiff', 'Collar steak')}</h3></div><ArrowUpRight size={26} /></Link>)}<Link href="/oppskrifter" className={styles.allRecipes}>{t('Flere oppskrifter fra gården', 'More recipes from the farm')}<ArrowUpRight size={19} /></Link></div></section>

      <section id="sporsmal" className={styles.practical}><div><h2>{t('GREIT Å VITE.', 'GOOD TO KNOW.')}</h2><p>{t('Fra bestilling til boksen er klar.', 'From placing your order to receiving your box.')}</p><ol className={styles.steps}><li><span>1</span><div><strong>{t('Velg boksen', 'Choose your box')}</strong><p>{t('Se innhold og pris. Betal 50 %.', 'See contents and price. Pay 50%.')}</p></div></li><li><span>2</span><div><strong>{t('Vi gjør den klar', 'We prepare it')}</strong><p>{t('Du får beskjed før levering.', 'We notify you before delivery.')}</p></div></li><li><span>3</span><div><strong>{t('Betal resten', 'Pay the balance')}</strong><p>{t('Hent eller få levert som avtalt.', 'Collect or receive as arranged.')}</p></div></li></ol></div><div className={styles.faq}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={21} /></summary><p>{answer}</p></details>)}<a href="mailto:post@tinglum.com">{t('Lurer du på noe annet? Kontakt oss.', 'Another question? Get in touch.')}<ArrowUpRight size={18} /></a></div></section>

      <section className={styles.final}><h2 data-reveal>{t('FYLL FRYSEREN.', 'FILL THE FREEZER.')}<br />{t('DEKK BORDET.', 'SET THE TABLE.')}</h2><div className={styles.finalAction}>{selected && <p>{name(selected)} · {selected.target_weight_kg} kg · {money(selected.price_nok)}</p>}<a href={selected && !soldOut ? href : '#bokser'} className={styles.primary}>{soldOut ? t('Se årets bokser', 'See this year’s boxes') : cta}<ArrowUpRight size={26} /></a>{selected && !soldOut && <small>{money(Math.floor(selected.price_nok / 2))} {t('ved bestilling', 'when ordering')}</small>}</div></section>
      {standalone && <footer className={styles.footer}><Link className={styles.footerBrand} href="/">TINGLUM GÅRD.</Link><p>Namdalseid · Trøndelag</p><div><Link href="/personvern">{t('Personvern', 'Privacy')}</Link><Link href="/vilkar">{t('Vilkår', 'Terms')}</Link><Link href="/min-side">{t('Min side', 'My account')}</Link></div></footer>}
      {selected && showOrderBar && <div className={styles.mobileOrder}><span><strong>{name(selected)}</strong><small>{money(Math.floor(selected.price_nok / 2))} {t('nå', 'now')} · {selected.target_weight_kg} kg</small></span>{soldOut ? <span>{t('Utsolgt', 'Sold out')}</span> : <Link href={href}>{t('Bestill', 'Order')}<ArrowUpRight size={20} /></Link>}</div>}
    </div>
  )
}
