"use client";

import { Instagram } from 'lucide-react';

export function InstagramFeed() {
  const instagramHandle = "tinglum.farm";
  const instagramUrl = `https://www.instagram.com/${instagramHandle}`;

  return (
    <section className="relative py-24 px-6 bg-gradient-to-b from-background to-ice/10 overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-ice/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-ice/30 rounded-full text-xs uppercase tracking-wider text-slate font-semibold mb-4">
            Følg oss på Instagram
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-4">
            Se hverdagen på gården
          </h2>
          <p className="text-lg text-slate/70 max-w-2xl mx-auto mb-8">
            Følg med på grisene som vokser opp, livet på gården og oppdateringer gjennom sesongen
          </p>

          {/* Instagram CTA Button */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold text-sm uppercase tracking-wider hover:scale-105 hover:shadow-2xl transition-all duration-300"
          >
            <Instagram className="w-5 h-5" />
            @{instagramHandle}
          </a>
        </div>

        {/* Instagram embed placeholder - using native Instagram embed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Placeholder cards that link to Instagram */}
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <a
              key={index}
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square bg-white/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate/10 hover:shadow-2xl hover:scale-105 transition-all duration-500"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-ice/40 via-transparent to-slate/20" />

              {/* Instagram icon overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-pink-600/90 to-purple-600/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Instagram className="w-16 h-16 text-white" />
              </div>

              {/* Placeholder content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Instagram className="w-12 h-12 text-slate/30 mx-auto" />
                  <p className="text-sm text-slate/50 font-semibold">Se bilder på Instagram</p>
                </div>
              </div>
            </a>
          ))}

        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-slate/70 mb-4">
            Besøk vår Instagram-side for mer innhold
          </p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-charcoal hover:text-slate transition-colors font-semibold"
          >
            Se alle bilder
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>

      </div>
    </section>
  );
}
