"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function Footer() {
  const { t } = useLanguage();
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  return (
    <footer className={cn("relative border-t overflow-hidden", theme.borderSecondary, `bg-gradient-to-b ${theme.bgPrimary} ${theme.bgSecondary}`)}>

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className={cn("absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl", theme.bgGradientOrbs[0])} />
        <div className={cn("absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl", theme.bgGradientOrbs[1])} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg", theme.buttonPrimary)}>
                TG
              </div>
              <div>
                <h3 className={cn("text-xl font-bold", theme.textPrimary)}>{t.footer.farm}</h3>
                <p className={cn("text-sm", theme.textMuted)}>Kvalitet fra Namdalseid</p>
              </div>
            </div>
            <p className={cn("text-sm leading-relaxed max-w-md", theme.textMuted)}>
              {t.footer.location}. Vi leverer norsk griskjøtt av høyeste kvalitet, oppvokst på gården og behandlet med omtanke fra start til slutt.
            </p>
            <div className="flex items-center gap-2">
              <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", theme.accentSecondary, theme.textSecondary)}>
                Lokalt oppvokst
              </div>
              <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", theme.accentSecondary, theme.textSecondary)}>
                Sesongbasert
              </div>
            </div>
          </div>

          {/* Contact column */}
          <div className="space-y-4">
            <h3 className={cn("text-sm font-bold uppercase tracking-wider", theme.textPrimary)}>
              {t.footer.contact}
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:post@tinglum.com"
                className={cn("flex items-center gap-2 text-sm transition-colors group", theme.textMuted, `hover:${theme.textPrimary}`)}
              >
                <svg className={cn("w-5 h-5 transition-colors", theme.iconColor, `group-hover:${theme.textPrimary}`)} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                post@tinglum.com
              </a>
            </div>
          </div>

          {/* Links column */}
          <div className="space-y-4">
            <h3 className={cn("text-sm font-bold uppercase tracking-wider", theme.textPrimary)}>
              Lenker
            </h3>
            <div className="space-y-3">
              <a href="/produkt" className={cn("block text-sm transition-colors", theme.textMuted, `hover:${theme.textPrimary}`)}>
                Produktinformasjon
              </a>
              <a href="/oppdelingsplan" className={cn("block text-sm transition-colors", theme.textMuted, `hover:${theme.textPrimary}`)}>
                Oppdelingsplan
              </a>
              <a href="/min-side" className={cn("block text-sm transition-colors", theme.textMuted, `hover:${theme.textPrimary}`)}>
                Min side
              </a>
              <a href="/admin" className={cn("block text-sm transition-colors", theme.textMuted, `hover:${theme.textPrimary}`)}>
                Admin
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className={cn("pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4", theme.borderSecondary)}>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <p className={cn("text-sm", theme.textMuted)}>
              © 2024 {t.footer.farm}. Alle rettigheter reservert.
            </p>
            <a
              href="/vilkar"
              className={cn("text-sm transition-colors underline", theme.textMuted, `hover:${theme.textPrimary}`)}
            >
              {t.footer.legal}
            </a>
          </div>
          <div className={cn("flex items-center gap-6 text-xs", theme.textMuted)}>
            <span>🇳🇴 Norsk kvalitet</span>
            <span>•</span>
            <span>Sesong 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
