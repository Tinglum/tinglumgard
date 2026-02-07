'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language } from './types'

interface Translations {
  no: Record<string, any>
  en: Record<string, any>
}

const translations: Translations = {
  no: {
    nav: {
      breeds: 'Raser',
      howItWorks: 'Slik fungerer det',
      myOrders: 'Mine bestillinger',
    },
    hero: {
      title: 'Klekkegg fra utvalgte raser',
      subtitle: 'Befruktede egg fra robuste høns. Ukentlige batcher. Levering over hele Norge.',
      cta: 'Se raser',
    },
    browse: {
      byBreed: 'Vis per rase',
      byWeek: 'Vis per uke',
      week: 'Uke',
      eggsAvailable: 'egg tilgjengelig',
      soldOut: 'Utsolgt',
    },
    breed: {
      pricePerEgg: 'kr / egg',
      deliveryFrom: 'Frakt fra',
      calculatedAtCheckout: 'per forsendelse (beregnes ved kassen)',
      minOrder: 'Min bestilling',
      eggs: 'egg',
      viewDetails: 'Se detaljer',
      characteristics: 'Egenskaper',
      eggColor: 'Eggfarge',
      size: 'Størrelse',
      temperament: 'Temperament',
      production: 'Årsproduksjon',
      hatchingInfo: 'Klekkinformasjon',
      incubation: 'Rugetid',
      days: 'dager',
      temperature: 'Temperatur',
      humidity: 'Luftfuktighet',
      selectWeek: 'Velg leveringsuke',
      available: 'Tilgjengelig',
      lowStock: 'Få igjen',
      qualityNote:
        'Alle egg er fra frittgående høns som fôres med økologisk fôr. Vi garanterer ikke klekkeresultat da dette påvirkes av mange faktorer under transport og klekking.',
    },
    quantity: {
      selectQuantity: 'Velg antall egg',
      available: 'tilgjengelig denne uken',
      numberOfEggs: 'Antall egg',
      min: 'Minimum',
      max: 'maksimum',
      eggs: 'egg',
      subtotal: 'Subtotal',
      shippingCalculated: 'frakt beregnes i neste steg',
      continueToDelivery: 'Fortsett til levering',
      addToCart: 'Legg til i handlekurv',
    },
    delivery: {
      selectMethod: 'Velg leveringsmåte',
      howReceive: 'Hvordan vil du motta eggene dine?',
      farmPickup: 'Henting på gården',
      farmAddress: 'Tinglumgård, 7600 Levanger',
      farmDetails: 'Hent mandag mellom 16:00-20:00',
      posten: 'Posten Norge',
      postenDetails: 'Levering til din postkasse',
      postenShipping: 'Sendes mandag, ankomst onsdag-fredag',
      e6Pickup: 'Henting ved E6',
      e6Details: 'Møtepunkt ved E6 (nord for Trondheim)',
      e6Coordination: 'Koordineres på SMS etter bestilling',
      notAvailable: 'Ikke tilgjengelig denne uken',
      free: 'Gratis',
      shippingInfo:
        'Alle egg pakkes forsvarlig i spesiallagde skumholdere. Ved postforsendelse er det ingen garanti mot skader under transport.',
    },
    payment: {
      summary: 'Betalingsoversikt',
      reviewOrder: 'Gjennomgå bestillingen din før betaling',
      subtotal: 'Subtotal',
      shipping: 'Frakt',
      total: 'Totalt',
      paymentPlan: '50/50 betalingsplan',
      depositNow: 'Depositum (nå)',
      depositDescription: 'Betales med Vipps for å reservere eggene dine',
      remainderLater: 'Restbeløp (senere)',
      remainderDescription: 'Betales 11-6 dager før leveringsuke via e-post lenke',
      cancellationPolicy: 'Avbestillingsvilkår',
      cancellationText:
        'Depositum refunderes fullt ut ved avbestilling inntil 14 dager før leveringsuke. Etter dette er depositum ikke-refunderbart.',
      payDepositWith: 'Betal depositum med Vipps',
    },
    confirmation: {
      orderConfirmed: 'Bestilling bekreftet!',
      emailConfirmation: 'Du vil motta en bekreftelse på e-post om kort tid',
      orderNumber: 'Ordrenummer',
      orderDetails: 'Ordredetaljer',
      whatHappensNow: 'Hva skjer nå?',
      day11: 'Dag -11: Du mottar e-post med påminnelse om restbeløp',
      day9to6: 'Dag -9 til -6: Flere påminnelser sendes med betalingslenke',
      day4to1: 'Dag -4 til -1: Vi sjekker værmelding. Du kontaktes hvis fare for frost',
      monday: 'Mandag: Eggene sendes/hentes som avtalt',
      viewOrders: 'Se mine bestillinger',
      orderMore: 'Bestill flere egg',
    },
    orders: {
      myOrders: 'Mine bestillinger',
      upcoming: 'Kommende',
      past: 'Tidligere',
      noOrders: 'Ingen bestillinger ennå',
      startFirst: 'Start din første bestilling i dag',
      viewBreeds: 'Se raser',
      newOrder: 'Ny bestilling',
      depositPaid: 'Depositum betalt',
      fullyPaid: 'Fullt betalt',
      shipped: 'Sendt',
      delivered: 'Levert',
      cancelled: 'Kansellert',
      remainderDue: 'Restbeløp forfaller',
      payRemainder: 'Betal restbeløp',
    },
    common: {
      week: 'Uke',
      monday: 'Mandag',
      backTo: 'Tilbake til',
      loading: 'Laster...',
      error: 'Noe gikk galt',
    },
  },
  en: {
    nav: {
      breeds: 'Breeds',
      howItWorks: 'How it works',
      myOrders: 'My orders',
    },
    hero: {
      title: 'Hatching eggs from selected breeds',
      subtitle: 'Fertilized eggs from robust chickens. Weekly batches. Delivery across Norway.',
      cta: 'View breeds',
    },
    browse: {
      byBreed: 'View by breed',
      byWeek: 'View by week',
      week: 'Week',
      eggsAvailable: 'eggs available',
      soldOut: 'Sold out',
    },
    breed: {
      pricePerEgg: 'kr / egg',
      deliveryFrom: 'Shipping from',
      calculatedAtCheckout: 'per shipment (calculated at checkout)',
      minOrder: 'Min order',
      eggs: 'eggs',
      viewDetails: 'View details',
      characteristics: 'Characteristics',
      eggColor: 'Egg color',
      size: 'Size',
      temperament: 'Temperament',
      production: 'Annual production',
      hatchingInfo: 'Hatching information',
      incubation: 'Incubation',
      days: 'days',
      temperature: 'Temperature',
      humidity: 'Humidity',
      selectWeek: 'Select delivery week',
      available: 'Available',
      lowStock: 'Low stock',
      qualityNote:
        'All eggs are from free-range chickens fed organic feed. We do not guarantee hatching results as this is affected by many factors during transport and incubation.',
    },
    quantity: {
      selectQuantity: 'Select quantity',
      available: 'available this week',
      numberOfEggs: 'Number of eggs',
      min: 'Minimum',
      max: 'maximum',
      eggs: 'eggs',
      subtotal: 'Subtotal',
      shippingCalculated: 'shipping calculated in next step',
      continueToDelivery: 'Continue to delivery',
      addToCart: 'Add to cart',
    },
    delivery: {
      selectMethod: 'Select delivery method',
      howReceive: 'How would you like to receive your eggs?',
      farmPickup: 'Farm pickup',
      farmAddress: 'Tinglumgård, 7600 Levanger',
      farmDetails: 'Pick up Monday between 16:00-20:00',
      posten: 'Norway Post',
      postenDetails: 'Delivery to your mailbox',
      postenShipping: 'Ships Monday, arrives Wednesday-Friday',
      e6Pickup: 'E6 Highway pickup',
      e6Details: 'Meeting point at E6 (north of Trondheim)',
      e6Coordination: 'Coordinated via SMS after order',
      notAvailable: 'Not available this week',
      free: 'Free',
      shippingInfo:
        'All eggs are carefully packed in special foam holders. With postal delivery, there is no guarantee against damage during transport.',
    },
    payment: {
      summary: 'Payment summary',
      reviewOrder: 'Review your order before payment',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      total: 'Total',
      paymentPlan: '50/50 payment plan',
      depositNow: 'Deposit (now)',
      depositDescription: 'Pay with Vipps to reserve your eggs',
      remainderLater: 'Remainder (later)',
      remainderDescription: 'Pay 11-6 days before delivery week via email link',
      cancellationPolicy: 'Cancellation policy',
      cancellationText:
        'Deposit is fully refundable if cancelled up to 14 days before delivery week. After this, deposit is non-refundable.',
      payDepositWith: 'Pay deposit with Vipps',
    },
    confirmation: {
      orderConfirmed: 'Order confirmed!',
      emailConfirmation: 'You will receive a confirmation email shortly',
      orderNumber: 'Order number',
      orderDetails: 'Order details',
      whatHappensNow: 'What happens now?',
      day11: 'Day -11: You receive email reminder about remainder payment',
      day9to6: 'Day -9 to -6: Multiple reminders sent with payment link',
      day4to1: 'Day -4 to -1: We check weather forecast. You will be contacted if there is risk of frost',
      monday: 'Monday: Eggs are shipped/picked up as agreed',
      viewOrders: 'View my orders',
      orderMore: 'Order more eggs',
    },
    orders: {
      myOrders: 'My orders',
      upcoming: 'Upcoming',
      past: 'Past',
      noOrders: 'No orders yet',
      startFirst: 'Start your first order today',
      viewBreeds: 'View breeds',
      newOrder: 'New order',
      depositPaid: 'Deposit paid',
      fullyPaid: 'Fully paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      remainderDue: 'Remainder due',
      payRemainder: 'Pay remainder',
    },
    common: {
      week: 'Week',
      monday: 'Monday',
      backTo: 'Back to',
      loading: 'Loading...',
      error: 'Something went wrong',
    },
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Record<string, any>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('no')

  // Load language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tinglumgard_language')
    if (stored === 'en' || stored === 'no') {
      setLanguageState(stored)
    }
  }, [])

  // Save language to localStorage when it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('tinglumgard_language', lang)
  }

  const value = {
    language,
    setLanguage,
    t: translations[language],
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
