"use client";

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function InstagramFeed() {
  const { t } = useLanguage();
  const instagramHandle = 'tinglum.farm';
  const instagramUrl = `https://www.instagram.com/${instagramHandle}`;
  const copy = t.instagramFeed;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('powr-social-feed-script')) {
      const script = document.createElement('script');
      script.id = 'powr-social-feed-script';
      script.src = 'https://www.powr.io/powr.js?platform=html';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <section className="relative py-24 px-6 bg-gradient-to-b from-background to-ice/10 overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-ice/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-ice/30 rounded-full text-xs uppercase tracking-wider text-slate font-semibold mb-4">
            {copy.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-4">{copy.title}</h2>
          <p className="text-lg text-slate/70 max-w-2xl mx-auto mb-8">{copy.description}</p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold text-sm uppercase tracking-wider hover:scale-105 hover:shadow-2xl transition-all duration-300"
          >
            @{instagramHandle}
          </a>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="powr-social-feed" id="f9232722_1769936830"></div>

          <noscript>
            <div className="mt-6 text-center">
              <p className="text-slate/70">{copy.fallback}</p>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-pink-600 font-semibold">
                @{instagramHandle}
              </a>
            </div>
          </noscript>
        </div>
      </div>
    </section>
  );
}
