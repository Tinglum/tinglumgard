import { type ThemeClasses } from '@/contexts/ThemeContext';
import { cn } from './utils';

export function getHeroStyles(theme: ThemeClasses) {
  return {
    badge: cn(
      "inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
      theme.bgCard,
      theme.borderSecondary,
      "border"
    ),
    badgeDot: cn("w-2 h-2 rounded-full animate-pulse shadow-lg", theme.accentBadge),
    badgeText: cn("text-sm font-bold tracking-wide", theme.textPrimary),
    headline: cn("text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight font-serif", theme.textPrimary),
    headlineGradient: cn("text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight font-serif inline-block", theme.gradientText),
    description: cn("text-lg md:text-xl leading-relaxed", theme.textMuted),
    buttonPrimary: cn(
      "group relative px-8 py-4 backdrop-blur-xl text-white rounded-2xl font-semibold text-base tracking-wide transition-all duration-300 overflow-hidden border border-white/10",
      theme.buttonPrimary,
      theme.buttonPrimaryHover,
      "hover:scale-105 hover:shadow-2xl"
    ),
    buttonSecondary: cn(
      "px-8 py-4 backdrop-blur-xl rounded-2xl font-semibold text-base border transition-all duration-300",
      theme.buttonSecondary,
      theme.textPrimary,
      theme.borderSecondary,
      theme.buttonSecondaryHover,
      "hover:shadow-xl hover:scale-105"
    ),
    trustIcon: theme.iconColor,
    trustText: cn("text-base font-medium", theme.textMuted),
  };
}

export function getCardStyles(theme: ThemeClasses) {
  return {
    card: cn(
      "rounded-3xl p-8 border shadow-2xl transition-all duration-500",
      theme.bgCard,
      theme.glassBorder,
      theme.glassCard
    ),
    title: cn("text-2xl md:text-3xl font-bold font-serif", theme.textPrimary),
    text: cn("text-base md:text-lg leading-relaxed", theme.textMuted),
  };
}

export function getBannerStyles(theme: ThemeClasses) {
  return {
    background: theme.bannerBg,
    gradient: cn("absolute inset-0 bg-gradient-to-br opacity-90", ...theme.bannerGradient),
    text: theme.textOnDark,
    button: cn(
      "px-10 py-5 rounded-2xl font-semibold text-lg tracking-wide transition-all duration-300 shadow-xl",
      theme.buttonDark,
      theme.buttonDarkHover,
      "hover:scale-105 hover:shadow-2xl"
    ),
    buttonOutline: cn(
      "px-10 py-5 backdrop-blur-xl border-2 rounded-2xl font-semibold text-lg tracking-wide transition-all duration-300 shadow-lg",
      "bg-white/10 border-white/60",
      theme.textOnDark,
      "hover:bg-white/20 hover:border-white hover:scale-105"
    ),
  };
}

export function getInventoryStyles(theme: ThemeClasses) {
  return {
    badge: cn("px-5 py-2 backdrop-blur-sm rounded-full text-sm font-bold border animate-pulse tracking-wide",
      theme.accentSecondary,
      theme.accentPrimary,
      "border-current/20"
    ),
    number: cn("relative text-8xl md:text-9xl font-bold leading-none tracking-tight mb-2 font-serif", theme.gradientText),
    label: cn("text-base font-semibold tracking-wide", theme.textMuted),
    progressBg: cn("h-3 rounded-full overflow-hidden shadow-inner", theme.progressBg),
    progressFill: cn("h-full rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden", theme.progressFill),
  };
}
