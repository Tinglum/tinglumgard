export const PIG_CAMPAIGN_CODE = 'KUNDEJUL15';
export const PIG_AMBASSADOR_PREFIX = 'JUL26';
export const PIG_AMBASSADOR_REWARD_NOK = 250;
export const PIG_AMBASSADOR_MAX_FRIENDS = 4;
export const PIG_CAMPAIGN_SUBJECT = 'Ullgris til jul – 15 % rabatt til deg (og 250 kr per venn)';
export const PIG_SITE = 'https://xn--tinglumgrd-85a.no';
export const PIG_DISPLAY_HOST = 'tinglumgård.no';

export function isPigAmbassadorCode(code?: string | null) {
  return Boolean(code && code.trim().toUpperCase().startsWith(PIG_AMBASSADOR_PREFIX));
}

export function pigOfferPrice(price: number, friends = 0) {
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(friends) || friends < 0 || friends > 5) throw new Error('Invalid box price or friend count');
  const originalDeposit = Math.round(price / 2);
  const discount = Math.round(originalDeposit * .3);
  const deposit = originalDeposit - discount;
  const baseRemainder = price - originalDeposit;
  const credit = Math.min(baseRemainder, Math.round(price * .1) * friends);
  return { deposit, discount, credit, remainder: baseRemainder - credit, total: price - discount - credit };
}

export function pigShareUrl(code: string) {
  return `${PIG_SITE}/?ref=${encodeURIComponent(code)}#bokser`;
}

export function pigShareDisplayUrl(code: string) {
  return `https://${PIG_DISPLAY_HOST}/?ref=${encodeURIComponent(code)}`;
}

export function pigShareHubUrl(code: string, via?: 'whatsapp' | 'facebook' | 'sms' | 'instagram') {
  const url = new URL(`${PIG_SITE}/del`);
  url.searchParams.set('code', code);
  if (via) url.searchParams.set('via', via);
  return url.toString();
}

export function pigShareMessage(code: string, lang = 'no') {
  if (isPigAmbassadorCode(code)) {
    return lang === 'no'
      ? `Tips til julemiddagen! Jeg har handlet fra Tinglum Gård i år og fikk en lenke som gir deg 15 % rabatt på kjøttboks fra utegående ullgris (Mangalitsa). Levering i Trondheim 20. des og E6/Oslo 21. des. Se boksene her: ${pigShareDisplayUrl(code)}`
      : `Christmas dinner tip! I've shopped from Tinglum Farm this year and got a link that gives you 15% off a free-range Mangalitsa pork box. Delivery in Trondheim 20 Dec and E6/Oslo 21 Dec. See the boxes here: ${pigShareDisplayUrl(code)}`;
  }
  return lang === 'no'
    ? `Jeg har bestilt ullgris fra Tinglum Gård! Du får 15 % rabatt på din boks via lenken min. Når du bestiller og betaler forskuddet, får jeg også bonus på min boks. Se innhold, priser og hentevalg her: ${pigShareUrl(code)}`
    : `I've ordered Mangalitsa pork from Tinglum Farm! You get 15% off your box through my link. When you order and pay the deposit, I also earn credit towards my box. See the contents, prices and collection options: ${pigShareUrl(code)}`;
}

export function pigShareLinks(code: string, lang = 'no') {
  const url = pigShareUrl(code);
  const message = pigShareMessage(code, lang);
  return {
    url,
    message,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`,
    sms: `sms:?&body=${encodeURIComponent(message)}`,
    smsHub: pigShareHubUrl(code, 'sms'),
    instagramHub: pigShareHubUrl(code, 'instagram'),
    hub: pigShareHubUrl(code),
  };
}

export type PigDelivery = 'farm' | 'trondheim' | 'e6' | 'oslo';
export const pigDeliveries: Record<PigDelivery, { label: string; date: string; fee: number; labelEn: string; dateEn: string }> = {
  farm: { label: 'Hent på gården i Namdalseid', date: 'Tid avtales', fee: 0, labelEn:'Collect at the farm in Namdalseid',dateEn:'By arrangement' },
  trondheim: { label: 'Henting i Trondheim', date: 'Søndag 20. desember', fee: 200,labelEn:'Collection in Trondheim',dateEn:'Sunday 20 December' },
  e6: { label: 'Møtepunkt langs E6 mot Oslo', date: 'Mandag 21. desember · møtepunkt avtales', fee: 400,labelEn:'E6 meeting point towards Oslo',dateEn:'Monday 21 December · meeting point by arrangement' },
  oslo: { label: 'Henting på Majorstuen, Oslo', date: 'Mandag 21. desember', fee: 200,labelEn:'Collection in Majorstuen, Oslo',dateEn:'Monday 21 December' },
};

// A prior pickup is an owner-approved local contact, not a known home address.
export function recommendedPigDelivery(contact: { county?: string; postal?: string; locationBasis?: string }): PigDelivery {
  if (['Oslo', 'Akershus', 'Østfold', 'Vestfold'].includes(contact.county || '')) return 'oslo';
  if (contact.county === 'Innlandet' || contact.county === 'Møre og Romsdal') return 'e6';
  if (contact.locationBasis === 'pickup_history' && !contact.postal) return 'farm';
  if (contact.county === 'Trøndelag') return Number(contact.postal) >= 7700 ? 'farm' : 'trondheim';
  return 'farm';
}

export type PaidReferral = { id: string; referee_phone?: string; referee_email?: string; credit_applied?: boolean; order_id: string; created_at?: string };
export type ReferralOrder = { id: string; status: string; payments?: { payment_type: string; status: string }[] };
export function qualifyingPigReferrals<T extends PaidReferral>(referrals: T[], orders: ReferralOrder[]) {
  const paid = new Set(orders.filter(o => !['draft', 'cancelled', 'forfeited', 'refunded'].includes(o.status) && o.payments?.some(p => p.payment_type === 'deposit' && p.status === 'completed')).map(o => o.id));
  const phones = new Set<string>(), emails = new Set<string>();
  return [...referrals].sort((a,b) => String(a.created_at).localeCompare(String(b.created_at))).filter(r => {
    if (!paid.has(r.order_id)) return false;
    const phone = String(r.referee_phone || '').replace(/\D/g, '').replace(/^(?:0047|47)(?=\d{8}$)/, '');
    const email = String(r.referee_email || '').trim().toLowerCase();
    if ((!phone && !email) || (phone && phones.has(phone)) || (email && emails.has(email))) return false;
    if (phone) phones.add(phone);
    if (email) emails.add(email);
    return true;
  }).slice(0,5);
}
