"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './ui/button';

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === 'no' ? 'en' : 'no')}
      className="text-sm font-medium transition-opacity hover:opacity-70"
      aria-label={t.eggs.common.toggleLanguageAria}
    >
      {lang === 'no' ? t.common.languageCodeEn : t.common.languageCodeNo}
    </Button>
  );
}
