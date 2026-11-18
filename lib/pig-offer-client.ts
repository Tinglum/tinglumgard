import { pigDeliveries, type PigDelivery } from './pig-campaign';

const cookieName = 'pig_order_choice';
const codePattern = /^[a-z0-9_-]{1,64}$/i;

// Remember only the offer code and pickup choice, never customer details.
export function rememberPigOffer(search: string) {
  const params = new URLSearchParams(search);
  let saved = new URLSearchParams();
  try {
    const cookie = document.cookie.split('; ').find(value => value.startsWith(`${cookieName}=`));
    if (cookie) saved = new URLSearchParams(decodeURIComponent(cookie.slice(cookieName.length + 1)));
  } catch { /* The URL still works when cookies are unavailable. */ }
  const hasIncomingCode = ['ref', 'rebate'].some(key => params.has(key));
  if (!hasIncomingCode) for (const key of ['ref', 'rebate']) {
    const value = saved.get(key);
    if (value && codePattern.test(value)) params.set(key, value);
  }
  if (!params.has('pickup') && saved.has('pickup')) params.set('pickup', saved.get('pickup')!);
  const choice = new URLSearchParams();
  const codeKey = params.has('ref') ? 'ref' : 'rebate';
  const code = params.get(codeKey);
  if (code && codePattern.test(code)) choice.set(codeKey, code.toUpperCase());
  const pickup = params.get('pickup');
  if (pickup && Object.hasOwn(pigDeliveries, pickup)) choice.set('pickup', pickup);
  try {
    document.cookie = `${cookieName}=${encodeURIComponent(choice.toString())}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch { /* Keep carrying choices in the URL. */ }
  return choice;
}

export function rememberPigPickup(pickup: PigDelivery) {
  rememberPigOffer(`pickup=${encodeURIComponent(pickup)}`);
}
