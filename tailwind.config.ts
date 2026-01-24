import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  safelist: [
    // Gradient utilities (required for all themes)
    'bg-gradient-to-r', 'bg-gradient-to-br', 'bg-gradient-to-b', 'bg-gradient-to-tr', 'bg-gradient-to-bl', 'bg-gradient-to-tl',
    'bg-clip-text', 'text-transparent',
    // Warm theme classes
    'text-charcoal', 'text-slate', 'text-slate/70', 'text-white', 'text-accent',
    'bg-white', 'bg-ice/20', 'bg-white/70', 'bg-charcoal', 'bg-accent/20', 'bg-accent/30', 'bg-ice/40', 'bg-ice/30',
    'from-ice/40', 'from-ice/30', 'to-slate/20', 'to-slate/10', 'from-slate/90', 'to-charcoal/90', 'from-slate', 'to-charcoal',
    'via-charcoal', 'via-white', 'to-muted', 'from-slate/10', 'via-ice/20',
    'border-white/80', 'border-slate/20',
    'hover:from-slate', 'hover:to-charcoal', 'hover:bg-white/90',
    // Monochrome theme classes
    'text-black', 'text-gray-800', 'text-gray-600', 'text-gray-900', 'text-gray-700',
    'bg-gray-50', 'bg-white/90', 'bg-black', 'bg-gray-200', 'bg-gray-700/30', 'bg-gray-600/40', 'bg-gray-100',
    'from-gray-200', 'from-gray-100', 'to-gray-400', 'to-gray-200', 'from-black', 'to-gray-900', 'from-gray-900', 'to-black', 'to-gray-800',
    'via-gray-900', 'via-white', 'via-gray-300', 'via-gray-800',
    'border-gray-200', 'border-gray-300',
    'hover:from-gray-900', 'hover:to-black', 'hover:bg-gray-50', 'hover:bg-gray-100',
    // Nordic theme classes
    'text-blue-950', 'text-blue-800', 'text-blue-700', 'text-blue-900', 'text-cyan-500',
    'bg-blue-50', 'bg-cyan-50', 'bg-white/80', 'bg-blue-900', 'bg-cyan-100', 'bg-cyan-400/30', 'bg-blue-400/40', 'bg-cyan-100', 'bg-blue-100',
    'from-cyan-200', 'from-cyan-100', 'from-blue-100', 'to-blue-300', 'to-blue-100', 'from-blue-700', 'to-blue-900', 'from-blue-600', 'to-blue-800',
    'from-blue-800', 'via-blue-900', 'via-blue-50', 'via-blue-700', 'to-blue-950', 'from-blue-200', 'via-cyan-200', 'to-blue-200',
    'from-blue-700', 'via-blue-800', 'to-blue-700',
    'border-blue-200', 'border-cyan-200',
    'hover:from-blue-600', 'hover:to-blue-800', 'hover:bg-blue-50',
  ],
  theme: {
    extend: {
      colors: {
        // Warm inviting palette - cozy and feel-good
        background: "#FAF8F5", // Warm cream
        surface: "#FFFFFF",
        slate: "#5C4E42", // Warm brown-gray
        ice: "#F5EBE0", // Warm beige
        charcoal: "#2C1810", // Warm dark brown
        muted: "#8B7355", // Warm muted brown
        accent: "#A67C52", // Warm caramel
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
      },
      letterSpacing: {
        'widest-xl': '0.25em',
      },
      boxShadow: {
        soft: "0 2px 20px rgba(0,0,0,0.04)",
        glass: "0 4px 30px rgba(0,0,0,0.06)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
