import { pigDeliveries, type PigDelivery } from '@/lib/pig-campaign';

const escapeHtml = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export type PigCampaignPersonalization = { name?: string; purchaseSummary?: string; delivery: PigDelivery };

export function renderPigCampaignEmail(template: string, person: PigCampaignPersonalization, options: { offerUrl: string; acceptingOrders?: boolean; reminder?: boolean }) {
  const delivery = pigDeliveries[person.delivery];
  if (!delivery) throw new Error('Missing confirmed pickup option');
  const firstName = (person.name || '').trim().split(/\s+/)[0];
  const destination = new URL(options.offerUrl);
  destination.searchParams.set('pickup',person.delivery);
  const replacements: Record<string,string> = {
    greeting: escapeHtml(firstName ? `Hei ${firstName}!` : 'Hei!'),
    purchase_summary: escapeHtml(person.purchaseSummary || 'Takk for kontakten med oss på Tinglum Gård i år.'),
    delivery_label: escapeHtml(delivery.label),
    delivery_date: escapeHtml(delivery.date),
    delivery_fee: delivery.fee ? `${delivery.fee} kr` : 'Gratis',
    offer_url: escapeHtml(destination.toString()),
    farm_video_url: 'https://xn--tinglumgrd-85a.no/#gardsfilm',
    stock_summary: options.acceptingOrders === false ? 'Vi tar ikke imot flere bestillinger akkurat nå. Se oppdatert status på nettsiden.' : options.reminder ? 'Har du ikke valgt ennå? Se hvilke bokser vi tar imot bestillinger på nå.' : 'Bestill tidlig – vi tilpasser boksene etter bestillingene.',
  };
  return template.replace(/{{\s*(\w+)\s*}}/g, (_,key:string) => {
    if (!(key in replacements)) throw new Error(`Unresolved email variable: ${key}`);
    return replacements[key];
  });
}
