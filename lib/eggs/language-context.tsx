'use client'

import { useLanguage as useAppLanguage, LanguageProvider as AppLanguageProvider } from '@/contexts/LanguageContext'

export function useLanguage() {
  const { lang, setLang, t } = useAppLanguage()
  return {
    language: lang,
    setLanguage: setLang,
    t,
  }
}

export const LanguageProvider = AppLanguageProvider
