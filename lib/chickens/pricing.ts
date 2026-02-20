/**
 * Chicken pricing and mortality utility functions.
 * All prices in NOK (not øre).
 */

/** Round to nearest 5 kr */
export function roundTo5(n: number): number {
  return Math.round(n / 5) * 5
}

/** Calculate age in whole weeks between hatch date and a reference date */
export function getAgeWeeks(hatchDate: Date | string, referenceDate: Date | string = new Date()): number {
  const hatch = typeof hatchDate === 'string' ? new Date(hatchDate) : hatchDate
  const ref = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate
  const diffMs = ref.getTime() - hatch.getTime()
  return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))
}

/**
 * Get hen price based on age.
 * - 0-3 weeks: fixed startPrice
 * - 4-16 weeks: startPrice + (ageWeeks - 3) * weeklyIncrease
 * - 16+ weeks: fixed adultPrice
 * All rounded to nearest 5 kr.
 */
export function getHenPrice(
  ageWeeks: number,
  startPrice: number,
  weeklyIncrease: number,
  adultPrice: number
): number {
  if (ageWeeks <= 3) {
    return roundTo5(startPrice)
  }
  if (ageWeeks >= 16) {
    return roundTo5(adultPrice)
  }
  return roundTo5(startPrice + (ageWeeks - 3) * weeklyIncrease)
}

/**
 * Estimate number of surviving chickens after mortality.
 * - Weeks 0-4: earlyRatePct per week (compound)
 * - Weeks 4+: lateRatePct per week (compound)
 */
export function getEstimatedSurvivors(
  initialCount: number,
  ageWeeks: number,
  earlyRatePct: number = 5.0,
  lateRatePct: number = 2.0
): number {
  let survivors = initialCount

  const earlyWeeks = Math.min(ageWeeks, 4)
  for (let w = 0; w < earlyWeeks; w++) {
    survivors *= (1 - earlyRatePct / 100)
  }

  const lateWeeks = Math.max(0, ageWeeks - 4)
  for (let w = 0; w < lateWeeks; w++) {
    survivors *= (1 - lateRatePct / 100)
  }

  return Math.floor(survivors)
}

/** Calculate 30% deposit amount */
export function getDepositAmount(totalNok: number): number {
  return Math.round(totalNok * 0.3)
}

/** Calculate remainder amount */
export function getRemainderAmount(totalNok: number): number {
  return totalNok - getDepositAmount(totalNok)
}

/** Get ISO week number from a date */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Get Monday of a given ISO week */
export function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const mondayOfWeek1 = new Date(jan4)
  mondayOfWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1)
  const targetMonday = new Date(mondayOfWeek1)
  targetMonday.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7)
  return targetMonday
}
