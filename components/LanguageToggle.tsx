"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './ui/button';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === 'no' ? 'en' : 'no')}
      className="text-sm font-medium transition-opacity hover:opacity-70"
      aria-label={`Switch to ${lang === 'no' ? 'English' : 'Norwegian'}`}
    >
      {lang === 'no' ? 'EN' : 'NO'}
    </Button>
  );
}
