'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

const packageData = [
  {
    size: 8,
    weight: '8 kg',
    people: '2-3 personer',
    items: ['2kg ribbe', '1kg steik', '1kg farse', '0.5kg pølse'],
    popular: false,
  },
  {
    size: 12,
    weight: '12 kg',
    people: '4-6 personer',
    items: ['3kg ribbe', '1kg steik', '1.5kg farse', '1kg pølse'],
    popular: true,
  },
];

export function MobileProductTiles() {
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch('/api/config/pricing');
        if (res.ok) {
          const data = await res.json();
          setPricing(data);
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      }
    }
    fetchPricing();
  }, []);

  const packages = packageData.map(pkg => ({
    ...pkg,
    price: pkg.size === 8 
      ? (pricing ? pricing.box_8kg_price : null)
      : (pricing ? pricing.box_12kg_price : null)
  }));
  
  return (
    <section className="relative py-16 px-4" style={{ backgroundColor: 'var(--farm-snow)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--farm-earth)' }}>
          Velg størrelse
        </h2>
        <p className="font-semibold" style={{ color: 'var(--farm-bark)' }}>
          To pakker • Samme kvalitet
        </p>
      </motion.div>

      <div className="max-w-md mx-auto space-y-6">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.size}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="card-mobile-elevated p-6"
          >
            {pkg.popular && (
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{ backgroundColor: 'var(--accent-gold)', color: 'white' }}>
                MEST POPULÆR
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-4xl font-bold" style={{ color: 'var(--farm-earth)' }}>
                  {pkg.size} <span className="text-xl" style={{ color: 'var(--farm-bark)' }}>kg</span>
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--farm-bark)' }}>
                  {pkg.people}
                </div>
              </div>
              {pkg.price ? (
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: 'var(--farm-earth)' }}>
                    {pkg.price.toLocaleString('nb-NO')} kr
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--farm-bark)' }}>
                    Forskudd: {Math.floor(pkg.price * 0.5).toLocaleString('nb-NO')} kr
                  </div>
                </div>
              ) : (
                <div className="text-lg pulse-loading" style={{ color: 'var(--farm-bark)' }}>
                  Laster...
                </div>
              )}
            </div>

            <div className="space-y-2 mb-6">
              {pkg.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--status-success)' }} />
                  <span className="text-sm" style={{ color: 'var(--farm-bark)' }}>{item}</span>
                </div>
              ))}
            </div>

            <Link 
              href={`/bestill?size=${pkg.size}`}
              className="block w-full py-3 rounded-xl text-center font-bold touch-feedback"
              style={{ backgroundColor: 'var(--farm-earth)', color: 'var(--farm-snow)' }}
            >
              Velg {pkg.size}kg kasse
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="relative"
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
                  <span
                    className="text-6xl font-bold text-white"
                    style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
                  >
                    {pkg.weight}
                  </span>
                  <p
                    className="text-white font-semibold text-sm mt-1"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                  >
                    {pkg.people}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="text-white text-xs uppercase tracking-wide mb-1 font-bold"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                  >
                    Totalt
                  </div>
                  <div
                    className="text-white font-bold text-2xl"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
                  >
                    {pkg.price} kr
                  </div>
                </div>
              </div>

              {/* Quick items list - ultra minimal */}
              <div className="space-y-2 mb-6">
                {pkg.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-white font-semibold text-sm">
                    <svg className="w-4 h-4 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>{item}</span>
                  </div>
                ))}
                <div
                  className="text-white font-semibold text-xs pt-2"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  + slakterens valg
                </div>
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
          className="inline-flex items-center gap-2 text-white hover:text-white text-sm font-semibold transition-colors tap-target"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
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
