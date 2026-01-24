'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type ThemeMode = 'warm' | 'monochrome' | 'nordic';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  getThemeClasses: () => ThemeClasses;
}

export interface ThemeClasses {
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnDark: string;

  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgDark: string;
  bgGradientOrbs: string[];
  bgGradientHero: string;

  // Border colors
  borderPrimary: string;
  borderSecondary: string;

  // Gradient text
  gradientText: string;

  // Button styles
  buttonPrimary: string;
  buttonPrimaryHover: string;
  buttonSecondary: string;
  buttonSecondaryHover: string;
  buttonDark: string;
  buttonDarkHover: string;

  // Accent colors
  accentPrimary: string;
  accentSecondary: string;
  accentBadge: string;

  // Glass effects
  glassCard: string;
  glassBorder: string;

  // Progress bar
  progressBg: string;
  progressFill: string;

  // Icons
  iconColor: string;

  // Banner/CTA section
  bannerBg: string;
  bannerGradient: string[];
  bannerPattern: string;
  bannerOrbs: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfigs: Record<ThemeMode, ThemeClasses> = {
  warm: {
    textPrimary: 'text-charcoal',
    textSecondary: 'text-slate',
    textMuted: 'text-slate/70',
    textOnDark: 'text-white',

    bgPrimary: 'bg-white',
    bgSecondary: 'bg-ice/20',
    bgCard: 'bg-white/70',
    bgDark: 'bg-charcoal',
    bgGradientOrbs: ['from-ice/40', 'to-slate/20'],
    bgGradientHero: 'bg-gradient-to-br from-ice/30 via-white to-slate/10',

    borderPrimary: 'border-white/80',
    borderSecondary: 'border-slate/20',

    gradientText: 'bg-gradient-to-r from-slate via-charcoal to-slate bg-clip-text text-transparent',

    buttonPrimary: 'bg-gradient-to-r from-slate/90 to-charcoal/90',
    buttonPrimaryHover: 'hover:from-slate hover:to-charcoal',
    buttonSecondary: 'bg-white/70',
    buttonSecondaryHover: 'hover:bg-white/90',
    buttonDark: 'bg-white text-charcoal',
    buttonDarkHover: 'hover:bg-white/90',

    accentPrimary: 'text-accent',
    accentSecondary: 'bg-accent/20',
    accentBadge: 'bg-gradient-to-r from-slate to-charcoal',

    glassCard: 'backdrop-blur-2xl',
    glassBorder: 'border-white/80',

    progressBg: 'bg-gradient-to-r from-slate/10 via-ice/20 to-slate/10',
    progressFill: 'bg-gradient-to-r from-slate via-charcoal to-slate',

    iconColor: 'text-slate',

    bannerBg: 'bg-charcoal',
    bannerGradient: ['from-slate', 'via-charcoal', 'to-muted'],
    bannerPattern: 'rgba(245,235,224,0.4)',
    bannerOrbs: ['bg-accent/30', 'bg-ice/40'],
  },
  monochrome: {
    textPrimary: 'text-black',
    textSecondary: 'text-gray-800',
    textMuted: 'text-gray-600',
    textOnDark: 'text-white',

    bgPrimary: 'bg-white',
    bgSecondary: 'bg-gray-50',
    bgCard: 'bg-white/90',
    bgDark: 'bg-black',
    bgGradientOrbs: ['from-gray-200', 'to-gray-400'],
    bgGradientHero: 'bg-gradient-to-br from-gray-100 via-white to-gray-200',

    borderPrimary: 'border-gray-200',
    borderSecondary: 'border-gray-300',

    gradientText: 'bg-gradient-to-r from-black via-gray-800 to-black bg-clip-text text-transparent',

    buttonPrimary: 'bg-gradient-to-r from-black to-gray-900',
    buttonPrimaryHover: 'hover:from-gray-900 hover:to-black',
    buttonSecondary: 'bg-white',
    buttonSecondaryHover: 'hover:bg-gray-50',
    buttonDark: 'bg-white text-black',
    buttonDarkHover: 'hover:bg-gray-100',

    accentPrimary: 'text-gray-900',
    accentSecondary: 'bg-gray-200',
    accentBadge: 'bg-gradient-to-r from-black to-gray-800',

    glassCard: 'backdrop-blur-xl',
    glassBorder: 'border-gray-300',

    progressBg: 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
    progressFill: 'bg-gradient-to-r from-black via-gray-800 to-black',

    iconColor: 'text-gray-700',

    bannerBg: 'bg-black',
    bannerGradient: ['from-black', 'via-gray-900', 'to-gray-800'],
    bannerPattern: 'rgba(255,255,255,0.1)',
    bannerOrbs: ['bg-gray-700/30', 'bg-gray-600/40'],
  },
  nordic: {
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-600',
    textOnDark: 'text-white',

    bgPrimary: 'bg-blue-50',
    bgSecondary: 'bg-cyan-50',
    bgCard: 'bg-white/80',
    bgDark: 'bg-blue-900',
    bgGradientOrbs: ['from-cyan-200', 'to-blue-300'],
    bgGradientHero: 'bg-gradient-to-br from-cyan-100 via-blue-50 to-blue-100',

    borderPrimary: 'border-blue-200',
    borderSecondary: 'border-cyan-200',

    gradientText: 'bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent',

    buttonPrimary: 'bg-gradient-to-r from-blue-700 to-blue-900',
    buttonPrimaryHover: 'hover:from-blue-600 hover:to-blue-800',
    buttonSecondary: 'bg-white/70',
    buttonSecondaryHover: 'hover:bg-white/90',
    buttonDark: 'bg-white text-blue-900',
    buttonDarkHover: 'hover:bg-blue-50',

    accentPrimary: 'text-cyan-600',
    accentSecondary: 'bg-cyan-100',
    accentBadge: 'bg-gradient-to-r from-blue-700 to-blue-900',

    glassCard: 'backdrop-blur-2xl',
    glassBorder: 'border-blue-200',

    progressBg: 'bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-200',
    progressFill: 'bg-gradient-to-r from-blue-700 via-blue-800 to-blue-700',

    iconColor: 'text-gray-700',

    bannerBg: 'bg-blue-900',
    bannerGradient: ['from-blue-800', 'via-blue-900', 'to-blue-950'],
    bannerPattern: 'rgba(200,230,255,0.3)',
    bannerOrbs: ['bg-cyan-400/30', 'bg-blue-400/40'],
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('warm');

  const getThemeClasses = (): ThemeClasses => {
    return themeConfigs[theme];
  };

  // Update CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, getThemeClasses }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
