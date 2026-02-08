import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nordic minimal palette - neutral and refined
        // Using Tailwind's default neutral palette
        // No custom colors needed - rely on neutral-* scale
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
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
      boxShadow: {
        // Nordic dramatic shadows
        'nordic-soft': '0 10px 30px -10px rgba(0,0,0,0.08)',
        'nordic-card': '0 20px 60px -15px rgba(0,0,0,0.08)',
        'nordic-hover': '0 30px 80px -20px rgba(0,0,0,0.12)',
        'nordic-strong': '0 40px 100px -25px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
