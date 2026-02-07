"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function Footer() {
  const { t } = useLanguage();
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  return (
    <footer className="relative overflow-hidden bg-neutral-50">

      {/* Minimalist gradient background with subtle depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl bg-neutral-200" />
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl bg-neutral-100" />
      </div>

      {/* Top border with minimal shadow */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)',
          boxShadow: '0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-900 text-white font-bold transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
                TG
              </div>
              <div>
                <h3 className="text-xl font-light text-neutral-900">{t.footer.farm}</h3>
                <p className="text-sm font-light text-neutral-500">{t.footer.quality}</p>
              </div>
            </div>
            <p className="text-sm font-light leading-relaxed max-w-md text-neutral-600">
              {t.footer.description}
            </p>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full text-xs font-light bg-white text-neutral-700 border border-neutral-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {t.footer.localRaised}
              </div>
              <div className="px-3 py-1.5 rounded-full text-xs font-light bg-white text-neutral-700 border border-neutral-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {t.footer.seasonBased}
              </div>
            </div>
          </div>

          {/* Contact column */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              {t.footer.contact}
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:post@tinglum.com"
                className="flex items-center gap-2 text-sm font-light transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                post@tinglum.com
              </a>
            </div>
          </div>

          {/* Links column */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              {t.footer.links}
            </h3>
            <div className="space-y-3">
              <a
                href="/produkt"
                className="block text-sm font-light transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:-translate-y-0.5"
              >
                {t.footer.productInfo}
              </a>
              <a
                href="/oppdelingsplan"
                className="block text-sm font-light transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:-translate-y-0.5"
              >
                {t.nav.oppdelingsplan}
              </a>
              <a
                href="/min-side"
                className="block text-sm font-light transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:-translate-y-0.5"
              >
                {t.footer.myPage}
              </a>
              <a
                href="/admin"
                className="block text-sm font-light transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:-translate-y-0.5"
              >
                {t.footer.admin}
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar with minimal divider */}
        <div className="relative pt-8">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)',
              boxShadow: '0 1px 0 rgba(255, 255, 255, 0.8)'
            }}
          />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm font-light text-neutral-600">
                © 2026 {t.footer.farm}. {t.footer.rights}
              </p>
              <a
                href="/vilkar"
                className="text-sm font-light transition-all duration-300 underline text-neutral-600 hover:text-neutral-900"
              >
                {t.footer.legal}
              </a>
            </div>
            <div className="flex items-center gap-6 text-xs font-light text-neutral-600">
              <span>🇳🇴 {t.footer.norwegianQuality}</span>
              <span className="w-1 h-1 rounded-full bg-neutral-400" />
              <span>{t.footer.season}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
