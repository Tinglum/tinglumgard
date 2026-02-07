import { Language } from './types'

/**
 * Format price in Norwegian kroner
 * @param amountInOre - Amount in øre (1 kr = 100 øre)
 * @param language - Language for formatting
 */
export function formatPrice(amountInOre: number, language: Language = 'no'): string {
  const amountInKr = amountInOre / 100

  if (language === 'no') {
    return `${amountInKr.toLocaleString('nb-NO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} kr`
  }

  return `${amountInKr.toLocaleString('en-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} kr`
}

/**
 * Format date in Norwegian or English
 */
export function formatDate(date: Date, language: Language = 'no'): string {
  if (language === 'no') {
    return new Intl.DateTimeFormat('nb-NO', {
      day: 'numeric',
      month: 'long',
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

/**
 * Format full date with year
 */
export function formatDateFull(date: Date, language: Language = 'no'): string {
  if (language === 'no') {
    return new Intl.DateTimeFormat('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Get week number from date (ISO 8601)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Get Monday of a specific week (ISO 8601)
 */
export function getMondayOfWeek(year: number, week: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const isoWeekStart = simple
  if (dow <= 4) isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1)
  else isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay())
  return isoWeekStart
}

/**
 * Calculate days until date
 */
export function daysUntil(date: Date): number {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Generate unique order number
 */
export function generateOrderNumber(count: number): string {
  const year = new Date().getFullYear()
  const paddedCount = String(count + 1).padStart(3, '0')
  return `EGG-${year}-${paddedCount}`
}

/**
 * Class name utility (simple version)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
