'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronDown, CookingPot, Package, Snowflake, Users } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PIG_CUT_POLYGONS } from '@/lib/constants/pig-diagram'
import styles from './pig-sales-v2.module.css'

type PartKey = 'nakke' | 'svinebog' | 'kotelettkam' | 'ribbeside' | 'skinke' | 'knoke'

type PresetContent = {
  cut_slug?: string | null
  part_key?: string | null
  content_name_no: string
  content_name_en: string
  target_weight_kg?: number | null
  quantity?: number | null
  is_hero?: boolean
}

type Preset = {
  id: string
  slug: string
  name_no: string
  name_en: string
  short_pitch_no: string
  short_pitch_en: string
  description_no?: string | null
  description_en?: string | null
  target_weight_kg: number
  price_nok: number
  scarcity_message_no?: string | null
  scarcity_message_en?: string | null
  contents?: PresetContent[]
}

type Inventory = {
  boxesRemaining: number
  kgRemaining: number
  isLowStock: boolean
  isSoldOut: boolean
}

const polygonPart: Record<number, PartKey> = {
  3: 'nakke',
  8: 'svinebog',
  5: 'kotelettkam',
  7: 'ribbeside',
  9: 'skinke',
  10: 'knoke',
}

const partCopy = {
  no: {
    nakke: { name: 'Nakke', text: 'Marmorert, saftig og laget for lav varme. Her finner du nakkekam, coppa og noen av slakterens fineste små stykker.', cook: 'Langtidsstek, grill eller spek.' },
    svinebog: { name: 'Bog', text: 'Arbeidsmuskelen med dyp smak. Perfekt til gryter, pulled pork, stek og grov kjøttdeig.', cook: 'Trekk, braiser eller stek lenge.' },
    kotelettkam: { name: 'Kotelettkam', text: 'Møre koteletter, ytrefilet og tomahawk med den karakteristiske fettranden som gir ullgrisen smaken.', cook: 'Stek raskt og la kjøttet hvile.' },
    ribbeside: { name: 'Ribbeside', text: 'Ribbe, sideflesk og fett med tydelig marmorering. Novemberboksens naturlige midtpunkt.', cook: 'Langsteking, bacon eller porchetta.' },
    skinke: { name: 'Skinke', text: 'Store, magrere muskler med ren smak. Brukes til stek, speking og mange av gårdens foredlede produkter.', cook: 'Stek hel, salt eller spek.' },
    knoke: { name: 'Knoke', text: 'Kollagenrikt kjøtt som belønner tid. Gir kraft, supper og gryter en fylde du ikke får fra magre stykker.', cook: 'Kok sakte til kjøttet slipper beinet.' },
  },
  en: {
    nakke: { name: 'Collar', text: 'Marbled, juicy and made for low heat. This is where collar, coppa and some of the butcher\'s favourite small cuts live.', cook: 'Slow-roast, grill or cure.' },
    svinebog: { name: 'Shoulder', text: 'A hard-working cut with deep flavour. Ideal for stews, pulled pork, roasts and coarse mince.', cook: 'Braise, pull or roast slowly.' },
    kotelettkam: { name: 'Loin', text: 'Tender chops, loin and tomahawk with the distinctive fat that gives woolly pig its flavour.', cook: 'Sear quickly and rest well.' },
    ribbeside: { name: 'Belly', text: 'Ribs, belly and beautifully marbled fat. The natural centrepiece of a November box.', cook: 'Slow-roast, cure or roll as porchetta.' },
    skinke: { name: 'Ham', text: 'Large, leaner muscles with a clean flavour. Used for roasts, curing and many farm products.', cook: 'Roast whole, salt or cure.' },
    knoke: { name: 'Hock', text: 'Collagen-rich meat that rewards time and gives stock, soup and stew remarkable depth.', cook: 'Simmer until it leaves the bone.' },
  },
} as const

const recipeCards = [
  { src: '/recipes/norsk-ribbe-uten-svor.png', href: '/oppskrifter/ullgris-ribbe-langstekt', no: 'Langstekt ullgrisribbe', en: 'Slow-roasted woolly pig ribs', part: 'ribbeside' },
  { src: '/recipes/bog-carnitas-lime.jpg', href: '/oppskrifter/bog-carnitas-lime', no: 'Carnitas av bog', en: 'Shoulder carnitas', part: 'svinebog' },
  { src: '/recipes/koteletter-harissa-yoghurt.jpg', href: '/oppskrifter/koteletter-harissa-yoghurt', no: 'Koteletter med harissa', en: 'Harissa pork chops', part: 'kotelettkam' },
]

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function PigSalesV2() {
  const { lang, setLang } = useLanguage()
  const isNo = lang === 'no'
  const locale = isNo ? 'nb-NO' : 'en-US'
  const reduce = useReducedMotion()
  const [presets, setPresets] = useState<Preset[]>([])
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPart, setSelectedPart] = useState<PartKey>('ribbeside')
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [household, setHousehold] = useState(3)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/mangalitsa/presets').then((res) => res.json()),
      fetch('/api/inventory').then((res) => res.json()),
    ])
      .then(([presetData, inventoryData]) => {
        const nextPresets = presetData.presets || []
        setPresets(nextPresets)
        setSelectedPreset(nextPresets[0] || null)
        if (!inventoryData.error) setInventory(inventoryData)
      })
      .finally(() => setLoading(false))
  }, [])

  const recommendedPreset = useMemo(() => {
    if (!presets.length) return null
    const targetKg = household <= 2 ? 8 : household <= 4 ? 10 : 12
    return [...presets].sort((a, b) => Math.abs(a.target_weight_kg - targetKg) - Math.abs(b.target_weight_kg - targetKg))[0]
  }, [household, presets])

  const selectedParts = useMemo(() => {
    const parts = new Set((selectedPreset?.contents || []).map((item) => item.part_key).filter(Boolean))
    return parts
  }, [selectedPreset])

  const minPrice = useMemo(() => presets.length ? Math.min(...presets.map((preset) => preset.price_nok)) : null, [presets])

  const displayPresetName = (preset: Preset) => {
    const names: Record<string, [string, string]> = {
      'premium-cuts': ['Den lille gourmetboksen', 'The Small Gourmet Box'],
      'bbq-steakhouse': ['Grillboksen', 'The Grill Box'],
      julespesial: ['Juleboksen', 'The Christmas Box'],
      familieboks: ['Familieboksen', 'The Family Box'],
    }
    return names[preset.slug]?.[isNo ? 0 : 1] || (isNo ? preset.name_no : preset.name_en)
  }

  const copy = isNo ? {
    navStory: 'Historien', navPig: 'Hva får du?', navBoxes: 'Finn din boks', reserve: 'Bestill din boks', reserveNow: 'Bestill din boks nå',
    season: 'Novemberlevering 2026 · begrenset antall', hero: 'Ullgris fra Tinglum Gård.',
    heroBody: 'Velg boksen som passer familien og fryseren din. Oppvokst sakte i Namdalseid, stykket med omtanke og pakket for vinterens beste måltider.',
    explore: 'Finn riktig størrelse', boxesLeft: inventory?.isSoldOut ? 'Utsolgt' : inventory ? `${inventory.boxesRemaining} bokser igjen` : 'Bestillingen er åpen',
    deposit: '50 % nå · resten før levering', provenance: 'Oppvokst i Namdalseid', journal: 'Marmorert Mangalitsa · laget for lange måltider',
    storyTitle: 'Dette er ikke vanlig svinekjøtt.', storyBody: 'Mangalitsa vokser saktere og legger et fint lag av intramuskulært fett. Det gir kjøtt som taler tydeligere i panna, gryta og på julebordet. Vi selger hele dyret gjennom gjennomtenkte bokser, slik at mer blir brukt og mindre går til spille.',
    facts: ['Langsom vekst', 'Marmorert kjøtt', 'Hele dyret brukes'],
    pigTitle: 'Hva får du i boksen?', pigBody: 'Velg en del av grisen. Se hva den blir til, hvordan den tilberedes og om den finnes i boksen du har valgt.',
    inBox: 'I valgt boks', notInBox: 'Tilgjengelig som tillegg', cooking: 'Slik bruker du den', chooseBox: 'Velg en boks for a se delene',
    boxTitle: 'Finn boksen som passer livet ditt.', boxBody: 'Velg husholdningsstørrelse. Vi foreslår en boks, men du bestemmer.',
    people: 'personer', recommendation: 'Vårt forslag', meals: 'ca. måltider', freezer: 'fryseskuffer', total: 'Totalt', now: 'betales nå', select: 'Velg denne boksen', selected: 'Valgt boks',
    craftTitle: 'Prisen følger arbeidet.', craftBody: 'Sakte vekst, godt dyrehold, små volum og håndverksmessig stykningsarbeid koster mer. Til gjengjeld får du tydelig opprinnelse og kjøtt laget for å bli brukt.',
    process: [['1', 'Bestill', 'Velg boks og betal 50 % depositum.'], ['2', 'Vi gjør klart', 'Slakteren skjærer, pakker og merker hver del.'], ['3', 'Levering i november', 'Du betaler resten og mottar boksen fersk eller fryst.']],
    recipes: 'Tre steder å begynne', recipeBody: 'Hver del har sin rytme. Her er oppskrifter som lar ullgrisen smake som seg selv.',
    faqTitle: 'Før du bestiller', faqs: [
      ['Hvor mye fryseplass trenger jeg?', 'Regn omtrent en vanlig fryseskuff per 8-10 kg. Pakkene er flate og tydelig merket.'],
      ['Hva betyr 50 % depositum?', 'Halvparten betales ved reservasjon. Resten åpnes for betaling før levering.'],
      ['Kan jeg velge bort enkelte deler?', 'Boksene bruker hele dyret og har fast grunninnhold. Tillegg og ribbevalg kan tilpasses i bestillingen.'],
      ['Hvor leverer dere?', 'Leveringsvalg, pris og tilgjengelig område vises tydelig i bestillingen.'],
    ],
    finalTitle: 'Novembermiddagen starter her.', finalBody: 'Velg en boks nå. Vi tar oss av resten frem til den er klar for fryseren.',
  } : {
    navStory: 'The story', navPig: 'What is included?', navBoxes: 'Find your box', reserve: 'Order your box', reserveNow: 'Order your box now',
    season: 'November delivery 2026 · limited quantity', hero: 'Woolly pig from Tinglum Farm.',
    heroBody: 'Choose the box that fits your family and freezer. Raised slowly in Namdalseid, butchered thoughtfully and packed for winter meals.',
    explore: 'Find the right size', boxesLeft: inventory?.isSoldOut ? 'Sold out' : inventory ? `${inventory.boxesRemaining} boxes left` : 'Ordering is open',
    deposit: '50% now · the rest before delivery', provenance: 'Raised in Namdalseid', journal: 'Marbled Mangalitsa · made for long meals',
    storyTitle: 'This is not ordinary pork.', storyBody: 'Mangalitsa grows slowly and develops fine intramuscular fat. The result speaks more clearly in the pan, the pot and at the table. We sell the whole animal through considered boxes, so more gets used and less goes to waste.',
    facts: ['Slow grown', 'Naturally marbled', 'The whole animal is used'],
    pigTitle: 'What is in your box?', pigBody: 'Choose a part of the pig. See what it becomes, how to cook it and whether it is in your selected box.',
    inBox: 'In selected box', notInBox: 'Available as an extra', cooking: 'How to use it', chooseBox: 'Choose a box to highlight its cuts',
    boxTitle: 'Find the box that fits your life.', boxBody: 'Choose your household size. We will make a suggestion, but you decide.',
    people: 'people', recommendation: 'Our suggestion', meals: 'approx. meals', freezer: 'freezer drawers', total: 'Total', now: 'due now', select: 'Choose this box', selected: 'Selected box',
    craftTitle: 'The price follows the work.', craftBody: 'Slow growth, good husbandry, small volumes and skilled butchery cost more. In return, you get clear provenance and meat made to be used.',
    process: [['1', 'Order', 'Choose a box and pay a 50% deposit.'], ['2', 'We prepare it', 'The butcher cuts, packs and labels every piece.'], ['3', 'November delivery', 'Pay the balance and receive the box fresh or frozen.']],
    recipes: 'Three places to start', recipeBody: 'Every cut has its own rhythm. These recipes let the woolly pig taste like itself.',
    faqTitle: 'Before you order', faqs: [
      ['How much freezer space do I need?', 'Allow roughly one standard freezer drawer per 8-10 kg. Packages are flat and clearly labelled.'],
      ['What does the 50% deposit mean?', 'Half is paid when you reserve. The balance opens for payment before delivery.'],
      ['Can I remove individual cuts?', 'The boxes use the whole animal and have fixed core contents. Extras and rib choices can be adjusted during checkout.'],
      ['Where do you deliver?', 'Delivery options, price and the available area are shown clearly during checkout.'],
    ],
    finalTitle: 'Your November table starts here.', finalBody: 'Choose a box now. We will take care of the rest until it is ready for your freezer.',
  }

  const part = partCopy[isNo ? 'no' : 'en'][selectedPart]
  const checkoutHref = selectedPreset ? `/bestill?preset=${selectedPreset.slug}` : '/bestill'

  return (
    <main className={styles.page}>
      <div className={styles.grain} aria-hidden="true" />
      <header className={styles.nav}>
        <Link href="/v2" className={styles.brand} aria-label="Tinglum Gard">
          <span className={styles.brandMark}>TG</span>
          <span><strong>Tinglum Gård</strong><small>Namdalseid</small></span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#historien">{copy.navStory}</a><a href="#grisen">{copy.navPig}</a><a href="#bokser">{copy.navBoxes}</a>
        </nav>
        <div className={styles.navActions}>
          <button type="button" onClick={() => setLang(isNo ? 'en' : 'no')} aria-label="Change language">{isNo ? 'EN' : 'NO'}</button>
          <Link href={checkoutHref} className={styles.smallCta}>{copy.reserve}<ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <motion.p initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={styles.season}>{copy.season}</motion.p>
          <motion.h1 initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>{copy.hero}</motion.h1>
          <motion.p initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className={styles.heroBody}>{copy.heroBody}</motion.p>
          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className={styles.heroActions}>
            <Link href={checkoutHref} className={styles.primaryCta}>{copy.reserveNow}<ArrowRight size={19} /></Link>
            <a href="#bokser" className={styles.textCta}>{copy.explore}<ArrowDown size={18} /></a>
          </motion.div>
          <div className={styles.offerLine}>{minPrice && <strong>{isNo ? 'Fra' : 'From'} {minPrice.toLocaleString(locale)} kr</strong>}<span>{copy.deposit}</span></div>
          <div className={styles.heroMeta}><span>{copy.boxesLeft}</span><span>{copy.provenance}</span><span>{isNo ? 'Stykket og pakket for fryseren' : 'Butchered and freezer-ready'}</span></div>
        </div>
        <motion.div className={styles.heroArt} initial={reduce ? false : { opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
          <Image src="/recipes/norsk-ribbe-uten-svor.png" alt={isNo ? 'Langstekt ullgrisribbe klar til servering' : 'Slow-roasted woolly pig ribs ready to serve'} fill priority sizes="(min-width: 900px) 55vw, 100vw" className={styles.heroPig} />
          <span className={styles.artNote}>{copy.journal}</span>
        </motion.div>
      </section>

      <section id="bokser" className={styles.boxes}>
        <Reveal className={styles.boxIntro}><h2>{copy.boxTitle}</h2><p>{copy.boxBody}</p></Reveal>
        <div className={styles.householdPicker}><Users size={20} /><span>1</span><input type="range" min="1" max="6" value={household} onChange={(e) => setHousehold(Number(e.target.value))} aria-label={copy.people} /><strong>{household} {copy.people}</strong></div>
        {loading ? <div className={styles.loadingGrid}>{[1,2,3].map((item) => <span key={item} />)}</div> : (
          <div className={styles.boxGrid}>
            {presets.map((preset) => {
              const selected = selectedPreset?.id === preset.id
              const recommended = recommendedPreset?.id === preset.id
              const meals = Math.round(preset.target_weight_kg * 2.4)
              return <article key={preset.id} className={`${styles.boxCard} ${selected ? styles.boxSelected : ''}`}>
                {recommended && <span className={styles.recommended}>{copy.recommendation}</span>}
                <div className={styles.boxTop}><span>{preset.target_weight_kg} kg</span><Package size={28} /></div>
                <h3>{displayPresetName(preset)}</h3><p>{isNo ? preset.short_pitch_no : preset.short_pitch_en}</p>
                <div className={styles.boxFacts}><span><CookingPot size={17} />{meals} {copy.meals}</span><span><Snowflake size={17} />{Math.max(1, Math.round(preset.target_weight_kg / 8))} {copy.freezer}</span></div>
                <ul>{(preset.contents || []).slice(0, 5).map((item, i) => <li key={`${item.cut_slug || item.content_name_no}-${i}`}><Check size={14} />{isNo ? item.content_name_no : item.content_name_en}</li>)}</ul>
                <div className={styles.price}><span>{copy.total}</span><strong>{preset.price_nok.toLocaleString(locale)} kr</strong><small>{Math.floor(preset.price_nok / 2).toLocaleString(locale)} kr {copy.now}</small></div>
                <button type="button" onClick={() => setSelectedPreset(preset)}>{selected ? <><Check size={17} />{copy.selected}</> : copy.select}</button>
              </article>
            })}
          </div>
        )}
        <div className={styles.checkoutRail}><div><small>{copy.selected}</small><strong>{selectedPreset ? displayPresetName(selectedPreset) : '–'}</strong></div><Link href={checkoutHref}>{copy.reserve}<ArrowRight size={18} /></Link></div>
      </section>

      <section id="grisen" className={styles.explorer}>
        <Reveal className={styles.sectionHeading}><h2>{copy.pigTitle}</h2><p>{copy.pigBody}</p></Reveal>
        <div className={styles.explorerGrid}>
          <div className={styles.pigStage}>
            <Image src="/pig-diagram3.png" alt="" fill priority sizes="(min-width: 900px) 62vw, 100vw" className={styles.pigImage} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.hitAreas} aria-label={copy.explore}>
              {PIG_CUT_POLYGONS.map((polygon, index) => {
                const key = polygonPart[polygon.id]
                const active = selectedPart === key
                const included = selectedParts.has(key)
                return <polygon key={`${polygon.id}-${index}`} points={polygon.points} tabIndex={0} role="button" aria-label={partCopy[isNo ? 'no' : 'en'][key].name} onClick={() => setSelectedPart(key)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedPart(key)} className={`${styles.hitArea} ${active ? styles.hitActive : ''} ${included ? styles.hitIncluded : ''}`} />
              })}
            </svg>
          </div>
          <motion.aside key={selectedPart} initial={reduce ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={styles.partPanel}>
            <span className={styles.handLabel}>{selectedParts.has(selectedPart) ? copy.inBox : copy.notInBox}</span>
            <h3>{part.name}</h3><p>{part.text}</p>
            <div className={styles.cookNote}><CookingPot size={20} /><span><small>{copy.cooking}</small>{part.cook}</span></div>
            <div className={styles.partButtons}>{(Object.keys(partCopy.no) as PartKey[]).map((key) => <button type="button" key={key} onClick={() => setSelectedPart(key)} className={selectedPart === key ? styles.partButtonActive : ''}>{partCopy[isNo ? 'no' : 'en'][key].name}</button>)}</div>
            {!selectedPreset && <p className={styles.muted}>{copy.chooseBox}</p>}
          </motion.aside>
        </div>
      </section>

      <section id="historien" className={styles.story}>
        <Reveal className={styles.storyLead}><span>01</span><h2>{copy.storyTitle}</h2></Reveal>
        <Reveal className={styles.storyBody}><p>{copy.storyBody}</p><div>{copy.facts.map((fact) => <span key={fact}><Check size={17} />{fact}</span>)}</div></Reveal>
      </section>

      <section className={styles.craft}>
        <Reveal className={styles.craftCopy}><span className={styles.script}>Tinglum Gård</span><h2>{copy.craftTitle}</h2><p>{copy.craftBody}</p></Reveal>
        <div className={styles.process}>{copy.process.map(([number, title, body]) => <Reveal key={number} className={styles.processItem}><span>{number}</span><h3>{title}</h3><p>{body}</p></Reveal>)}</div>
      </section>

      <section className={styles.recipes}>
        <Reveal className={styles.sectionHeading}><h2>{copy.recipes}</h2><p>{copy.recipeBody}</p></Reveal>
        <div className={styles.recipeGrid}>{recipeCards.map((recipe, i) => <Reveal key={recipe.src} className={styles.recipeCard}><Link href={recipe.href}><div><Image src={recipe.src} alt="" fill priority={i === 0} sizes="(min-width: 800px) 33vw, 100vw" /></div><span>0{i + 1}</span><h3>{isNo ? recipe.no : recipe.en}</h3><p>{partCopy[isNo ? 'no' : 'en'][recipe.part as PartKey].name}<ArrowRight size={16} /></p></Link></Reveal>)}</div>
      </section>

      <section className={styles.faq}>
        <Reveal><h2>{copy.faqTitle}</h2></Reveal>
        <div>{copy.faqs.map(([question, answer], index) => <article key={question} className={styles.faqItem}><button type="button" onClick={() => setFaqOpen(faqOpen === index ? null : index)} aria-expanded={faqOpen === index}><span>{question}</span><ChevronDown className={faqOpen === index ? styles.chevronOpen : ''} /></button><div className={faqOpen === index ? styles.answerOpen : styles.answer}><p>{answer}</p></div></article>)}</div>
      </section>

      <section className={styles.finalCta}><span className={styles.sunSmall} aria-hidden="true" /><Reveal><p>{copy.season}</p><h2>{copy.finalTitle}</h2><span>{copy.finalBody}</span><Link href={checkoutHref}>{copy.reserve}<ArrowRight size={20} /></Link></Reveal></section>
      <footer className={styles.footer}><div className={styles.brand}><span className={styles.brandMark}>TG</span><span><strong>Tinglum Gård</strong><small>Namdalseid</small></span></div><p>© 2026 Tinglum Gård</p><div><Link href="/personvern">Personvern</Link><Link href="/vilkar">Vilkår</Link></div></footer>
    </main>
  )
}
