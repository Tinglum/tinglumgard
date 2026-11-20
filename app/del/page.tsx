'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import {
  isPigAmbassadorCode,
  PIG_AMBASSADOR_MAX_FRIENDS,
  PIG_AMBASSADOR_REWARD_NOK,
  pigShareLinks,
} from '@/lib/pig-campaign';

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.85 9.85 0 0 0 12.04 2Zm5.78 14.02c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.26-.29.58-.36.77-.36h.55c.18 0 .41-.07.65.49.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.3-.12.59.17.29.74 1.22 1.59 1.98 1.1.98 2.02 1.28 2.31 1.43.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.65-.14.26.1 1.69.8 1.98.94.29.14.48.22.55.34.07.12.07.7-.17 1.38Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.5v3.2h2.7V22h3.3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Zm2 5v2h12V9H6Zm0 4v2h8v-2H6Z" />
    </svg>
  );
}

export default function ShareHubPage() {
  const searchParams = useSearchParams();
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  const via = (searchParams.get('via') || '').trim().toLowerCase();
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);

  const links = code ? pigShareLinks(code, 'no') : null;
  const isAmbassador = isPigAmbassadorCode(code);

  useEffect(() => {
    if (!links) return;
    if (via === 'sms' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = links.sms;
    } else if (via === 'instagram') {
      navigator.clipboard?.writeText(links.message).then(() => {
        setCopied(true);
        setStatus('Teksten og lenken din er allerede kopiert! Trykk på «Del på Instagram» under for å åpne Instagram og lime inn.');
      }).catch(() => {});
    }
  }, [via, code]);

  async function copyMessage() {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.message);
      setCopied(true);
      setStatus('Tekst og personlig lenke er kopiert! Lim inn hvor du vil.');
    } catch {
      setStatus('Marker teksten under og kopier den.');
    }
  }

  async function shareInstagram() {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.message);
      setCopied(true);
    } catch {
      // Clipboard may require explicit gesture on some browsers
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '15 % rabatt på ullgris fra Tinglum Gård',
          text: links.message,
          url: links.url,
        });
        setStatus('Takk for at du deler!');
        return;
      } catch {
        // User dismissed or share unavailable; fall through to Instagram link
      }
    }

    setStatus('Tekst og lenke er kopiert! Lim inn i Instagram-innlegg, Story eller melding.');
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  }

  async function nativeShare() {
    if (!links) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '15 % rabatt på ullgris fra Tinglum Gård',
          text: links.message,
          url: links.url,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await copyMessage();
  }

  if (!code || !links) {
    return (
      <main className="min-h-screen bg-[#faf6ed] px-5 py-16 text-[#292b24]">
        <div className="mx-auto max-w-lg border border-[#d5cebf] bg-white p-8">
          <p className="text-xs font-bold tracking-widest uppercase text-[#b53e2d]">Tinglum Gård</p>
          <h1 className="mt-2 text-2xl font-bold">Delingslenken mangler kode</h1>
          <p className="mt-3 text-sm text-[#66675a]">
            Åpne den personlige delingslenken fra e-posten din eller fra Min side.
          </p>
          <Link href="/#bokser" className="mt-6 inline-block bg-[#b53e2d] px-5 py-3 text-sm font-semibold text-white">
            Se boksene på Tinglum Gård ↗
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf6ed] px-4 py-10 text-[#292b24]">
      <div className="mx-auto max-w-xl border border-[#d5cebf] bg-[#fffdf8] p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-[#d5cebf] pb-4">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            TINGLUM GÅRD<span className="text-[#b53e2d]">.</span>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66675a]">
            Kode: {code}
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold leading-tight sm:text-3xl">
          {isAmbassador
            ? `Gi venner 15 % rabatt – få ${PIG_AMBASSADOR_REWARD_NOK} kr per bestilling.`
            : 'Gi venner 15 % rabatt – få bonus på din boks.'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#4f5046]">
          {isAmbassador
            ? `Trykk på et ikon under for å dele ferdig utfylt melding med din personlige lenke. Du får ${PIG_AMBASSADOR_REWARD_NOK} kr per venn som bestiller og betaler forskuddet (maks ${PIG_AMBASSADOR_MAX_FRIENDS} venner = 1 000 kr).`
            : 'Trykk på et ikon under for å dele ferdig utfylt melding med din personlige lenke. Vennene får 15 % rabatt, og du får 10 % av din bokspris i bonus per venn.'}
        </p>

        {status && (
          <div role="status" className="mt-4 border-l-4 border-[#b53e2d] bg-[#f6ece7] px-4 py-3 text-sm font-medium text-[#292b24]">
            {status}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href={links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2.5 bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <WhatsAppIcon />
            <span>WhatsApp</span>
          </a>

          <a
            href={links.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2.5 bg-[#1877F2] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <FacebookIcon />
            <span>Facebook</span>
          </a>

          <a
            href={links.sms}
            className="flex min-h-[52px] items-center justify-center gap-2.5 bg-[#292b24] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <SmsIcon />
            <span>SMS</span>
          </a>

          <button
            type="button"
            onClick={shareInstagram}
            className="flex min-h-[52px] items-center justify-center gap-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <InstagramIcon />
            <span>Instagram</span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyMessage}
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 border border-[#292b24] bg-white px-4 py-2.5 text-sm font-semibold text-[#292b24] hover:bg-[#eee8dc]"
          >
            {copied ? <Check className="h-4 w-4 text-[#3a4827]" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Kopiert!' : 'Kopier tekst og lenke'}</span>
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="flex min-h-[46px] items-center justify-center gap-2 border border-[#d5cebf] bg-[#eee8dc] px-4 py-2.5 text-sm font-semibold text-[#292b24] hover:bg-[#e4dccd]"
          >
            <Share2 className="h-4 w-4" />
            <span>Del</span>
          </button>
        </div>

        <div className="mt-6 border border-[#d5cebf] bg-[#faf6ed] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#66675a]">Ferdig melding</p>
          <p className="mt-2 select-all break-words text-sm leading-relaxed text-[#292b24]">{links.message}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d5cebf] pt-3">
            <a
              href="/recipes/norsk-ribbe-uten-svor.png"
              download="tinglum-gard-ullgris.png"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b53e2d] underline"
            >
              <Download className="h-3.5 w-3.5" />
              Last ned ribbebilde til Instagram / Facebook
            </a>
            <Link href={`/?ref=${encodeURIComponent(code)}#bokser`} className="text-xs font-semibold text-[#292b24] underline">
              Se hva vennene dine ser ↗
            </Link>
          </div>
        </div>

        {isAmbassador && (
          <p className="mt-5 text-xs leading-relaxed text-[#66675a]">
            Gjelder nye kunder som bestiller og betaler forskuddet via din personlige lenke. Maks {PIG_AMBASSADOR_MAX_FRIENDS} venner (1 000 kr totalt). Utbetales som Visa-gavekort før 1. januar 2027. Gjelder ikke egenbestilling.
          </p>
        )}
      </div>
    </main>
  );
}
