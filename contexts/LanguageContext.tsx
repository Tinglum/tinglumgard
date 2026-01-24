"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { no } from '@/content/copy.no';
import { en } from '@/content/copy.en';

type Language = 'no' | 'en';
type Copy = typeof no;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Copy;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('no');
  const t = lang === 'no' ? no : en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
