'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
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

interface MobileProductTilesProps {
  pricing: any;
}

export function MobileProductTiles({ pricing }: MobileProductTilesProps) {

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
