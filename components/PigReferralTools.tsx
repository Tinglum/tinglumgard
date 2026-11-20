'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pigShareLinks } from '@/lib/pig-campaign';

type Progress = { paidFriends: number; creditEarned: number; boxRemainder: number; originalBoxPrice: number };

export function PigReferralTools({ code }: { code: string }) {
  const { lang } = useLanguage();
  const no = lang === 'no';
  const [progress, setProgress] = useState<Progress | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/referrals', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load referral progress');
        const data = await response.json();
        if (data.code === code) setProgress(data.progress || null);
        setLoaded(true);
      } catch (e) { if (!controller.signal.aborted) setError(no ? 'Fremdriften kunne ikke hentes. Prøv igjen fra Min side.' : 'Progress could not be loaded. Try again from My account.'); }
    }
    void load();
    const interval = setInterval(load, 60_000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [code, no]);
  const links = pigShareLinks(code, lang);
  const message = links.message;
  const url = links.url;
  const money = (amount: number) => `${amount.toLocaleString(no ? 'nb-NO' : 'en-GB')} kr`;
  if (loaded && !progress && !error) return <p className="rounded-xl border border-[#d5cebf] p-5 text-sm">{no ? 'Vennelenken blir klar når din første ullgriskasse og forskuddet er registrert.' : 'Your friend link becomes available when your first pork box and deposit are registered.'}</p>;
  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); }
    catch { setError(no ? 'Kunne ikke kopiere. Marker og kopier teksten nedenfor.' : 'Could not copy. Select and copy the text below.'); }
  }
  async function shareInstagram() {
    await copy();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Tinglum Gård', text: message, url }); return; } catch {}
    }
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  }
  return <section aria-label={no ? 'Del med venner' : 'Share with friends'} className="rounded-xl border border-[#d5cebf] bg-[#faf6ed] p-5 text-[#292b24]">
    <h2 className="text-xl font-semibold">{no ? 'Gi 15 %. Få resten av boksen dekket.' : 'Give 15%. Earn credit towards your box.'}</h2>
    <p className="mt-2 text-sm leading-relaxed">{no ? 'Vennene dine får 15 % rabatt via lenken din. Hver ny venn som bestiller en boks og betaler forskuddet, gir deg 10 % av din ordinære bokspris i bonus. Fem venner kan dekke resten av selve boksen.' : 'Friends get 15% off through your link. Each new friend who orders a box and pays the deposit earns you 10% of your original box price in credit. Five friends can cover the remaining box balance.'}</p>
    {progress && <div className="my-5" aria-live="polite">
      <p className="font-semibold">{no ? `${progress.paidFriends} av 5 venner` : `${progress.paidFriends} of 5 friends`}</p>
      <div className="my-2 h-3 w-full bg-[#d5cebf]" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={progress.paidFriends} aria-label={no ? 'Venner med betalt forskudd' : 'Friends with paid deposits'}><div className="h-full bg-[#b53e2d]" style={{width:`${Math.max(0,Math.min(5,progress.paidFriends))*20}%`}} /></div>
      <p className="text-sm">{no ? 'Opptjent bonus: ' : 'Credit earned: '}<strong>{money(progress.creditEarned)}</strong></p>
      <p className="text-sm">{no ? 'Rest for boksen etter opptjent bonus: ' : 'Box balance after earned credit: '}<strong>{money(progress.boxRemainder)}</strong></p>
      <p className="mt-1 text-xs">{no ? 'Transport og tillegg kommer utenom. Bare bestillinger med betalt forskudd teller.' : 'Transport and extras are additional. Only orders with paid deposits count.'}</p>
    </div>}
    {error && <p role="status" className="my-3 text-sm">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2.5">
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white">WhatsApp</a>
      <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white">Facebook</a>
      <a href={links.sms} className="inline-flex min-h-[44px] items-center bg-[#292b24] px-4 py-2.5 text-sm font-semibold text-white">SMS</a>
      <button type="button" onClick={shareInstagram} className="inline-flex min-h-[44px] items-center bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] px-4 py-2.5 text-sm font-semibold text-white">Instagram</button>
      <button type="button" onClick={copy} className="inline-flex min-h-[44px] items-center border border-[#292b24] bg-white px-4 py-2.5 text-sm font-semibold text-[#292b24]">{copied ? (no ? 'Kopiert!' : 'Copied!') : (no ? 'Kopier' : 'Copy')}</button>
    </div>
    <p className="mt-4 select-all break-words text-sm leading-relaxed">{message}</p>
    <a href={url} className="mt-2 block break-all text-xs underline">{no ? 'Åpne delingslenken' : 'Open sharing link'}</a>
  </section>;
}
