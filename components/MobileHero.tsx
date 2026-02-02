'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface MobileHeroProps {
  isSoldOut: boolean;
}

export function MobileHero({ isSoldOut }: MobileHeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20" style={{ backgroundColor: 'var(--farm-earth)' }}>
      <div className="w-full max-w-lg mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8 card-mobile"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--status-success)' }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: 'var(--status-success)' }}></span>
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--farm-earth)' }}>Sesong 2026</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
          style={{ color: 'var(--farm-snow)' }}
        >
          Ullgris fra
          <br />
          <span style={{ color: 'var(--accent-gold)' }}>Tinglum Gård</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg font-semibold mb-10 max-w-md mx-auto"
          style={{ color: 'var(--farm-snow)' }}
        >
          Lokalt oppvokst • Fersk levering • Desember 2026
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {!isSoldOut ? (
            <Link
              href="/bestill"
              className="inline-block px-8 py-4 rounded-xl font-bold text-lg touch-feedback"
              style={{ backgroundColor: 'var(--accent-gold)', color: 'var(--farm-earth)' }}
            >
              Bestill nå →
            </Link>
          ) : (
            <div
              className="inline-block px-8 py-4 rounded-xl font-bold text-lg opacity-60"
              style={{ backgroundColor: 'var(--farm-bark)', color: 'var(--farm-snow)' }}
            >
              Utsolgt for 2026
            </div>
          )}
        </motion.div>

        {/* Info text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-sm mt-6"
          style={{ color: 'var(--farm-sky)' }}
        >
          Begrenset antall • Levering i desember
        </motion.p>
      </div>
    </section>
  );
}
