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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            href={isSoldOut ? "#waitlist" : "/bestill"}
            className="group relative inline-flex items-center gap-3 glass-mobile-strong hover:glass-mobile px-8 py-5 rounded-2xl font-bold text-white shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 touch-feedback tap-target"
          >
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">{isSoldOut ? "Bli med på venteliste" : "Reserver nå"}</span>
            <svg
              className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </motion.div>

        {/* Trust badges - minimal icons only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-8 mt-12 text-white/60"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Lokalt</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Kvalitet</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
