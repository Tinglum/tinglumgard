'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const packages = [
  {
    size: 8,
    weight: '8 kg',
    price: '3 500',
    people: '2-3 personer',
    items: ['2kg ribbe', '1kg steik', '1kg farse', '0.5kg pølse'],
    popular: false,
  },
  {
    size: 12,
    weight: '12 kg',
    price: '4 800',
    people: '4-6 personer',
    items: ['3kg ribbe', '1kg steik', '1.5kg farse', '1kg pølse'],
    popular: true,
  },
];

export function MobileProductTiles() {
  return (
    <section className="relative py-16 px-4">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/10 via-transparent to-blue-900/10" />
      </div>

      {/* Section title - minimal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2
          className="text-3xl font-bold text-white mb-2"
          style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
        >
          Velg størrelse
        </h2>
        <p
          className="text-white font-semibold"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
        >
          To pakker • Samme kvalitet
        </p>
      </motion.div>

      {/* Product tiles - stacked on mobile, floating effect */}
      <div className="max-w-md mx-auto space-y-6">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.size}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="relative tile-float"
          >
            {/* Popular badge */}
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-xs font-bold text-white shadow-lg">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Mest populær
                </span>
              </div>
            )}

            {/* Card with holographic border */}
            <div className="relative glass-mobile-strong rounded-3xl p-6 holo-border shimmer-effect group hover:scale-[1.02] transition-transform duration-300 touch-feedback">
              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />

              {/* Size badge */}
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <span className="text-6xl font-bold text-white">{pkg.weight}</span>
                  <p className="text-white/60 text-sm mt-1">{pkg.people}</p>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Totalt</div>
                  <div className="text-white font-bold text-2xl">{pkg.price} kr</div>
                </div>
              </div>

              {/* Quick items list - ultra minimal */}
              <div className="space-y-2 mb-6">
                {pkg.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/80 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{item}</span>
                  </div>
                ))}
                <div className="text-white/50 text-xs pt-2">+ slakterens valg</div>
              </div>

              {/* CTA button */}
              <Link
                href={`/bestill?size=${pkg.size}`}
                className="block w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-2xl text-white font-bold text-center shadow-lg hover:shadow-xl transition-all duration-300 tap-target"
              >
                <span className="flex items-center justify-center gap-2">
                  Velg {pkg.weight}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA - view details */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="text-center mt-12"
      >
        <Link
          href="/produkt"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors tap-target"
        >
          <span>Se full innholdsliste</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </motion.div>
    </section>
  );
}
