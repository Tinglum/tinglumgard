export const OSLO_TIME_ZONE = 'Europe/Oslo'

type ZonedDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  isoDate: string
}

export interface EggAdditionOfferState {
  canAdd: boolean
  discountEligible: boolean
  useActualCollectedStock: boolean
  deliveryMonday: string | null
  dayBeforeDate: string | null
  collectionStart: string | null
  collectionEnd: string | null
  actualCutoffAt: Date | null
  actualCutoffIso: string | null
  actualCutoffDate: string | null
  actualCutoffHour: number | null
  actualCutoffMinute: number | null
}

function partsMap(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function shiftIsoDate(dateString: string, dayDelta: number): string {
  const [yearText, monthText, dayText] = String(dateString || '').split('-')
  const year = Number.parseInt(yearText || '', 10)
  const month = Number.parseInt(monthText || '', 10)
  const day = Number.parseInt(dayText || '', 10)

  if (!year || !month || !day) {
    return ''
  }

  const shifted = new Date(Date.UTC(year, month - 1, day))
  shifted.setUTCDate(shifted.getUTCDate() + dayDelta)
  return shifted.toISOString().slice(0, 10)
}

export function getZonedDateTimeParts(
  date: Date = new Date(),
  timeZone = OSLO_TIME_ZONE
): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const map = partsMap(formatter.formatToParts(date))
  const year = Number.parseInt(map.year || '0', 10)
  const month = Number.parseInt(map.month || '1', 10)
  const day = Number.parseInt(map.day || '1', 10)
  const hour = Number.parseInt(map.hour || '0', 10)
  const minute = Number.parseInt(map.minute || '0', 10)
  const second = Number.parseInt(map.second || '0', 10)

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    isoDate: `${year}-${pad2(month)}-${pad2(day)}`,
  }
}

function getTimeZoneOffsetMillis(date: Date, timeZone: string): number {
  const parts = getZonedDateTimeParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

export function zonedDateTimeToUtc(
  dateString: string,
  hour: number,
  minute: number,
  timeZone = OSLO_TIME_ZONE
): Date {
  const [yearText, monthText, dayText] = String(dateString || '').split('-')
  const year = Number.parseInt(yearText || '', 10)
  const month = Number.parseInt(monthText || '', 10)
  const day = Number.parseInt(dayText || '', 10)

  let utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  for (let i = 0; i < 2; i += 1) {
    const offset = getTimeZoneOffsetMillis(utcGuess, timeZone)
    utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offset)
  }

  return utcGuess
}

export function getEggAdditionOfferState(
  deliveryMonday: string | null | undefined,
  now = new Date()
): EggAdditionOfferState {
  const normalizedDeliveryMonday = String(deliveryMonday || '').trim()
  if (!normalizedDeliveryMonday) {
    return {
      canAdd: false,
      discountEligible: false,
      useActualCollectedStock: false,
      deliveryMonday: null,
      dayBeforeDate: null,
      collectionStart: null,
      collectionEnd: null,
      actualCutoffAt: null,
      actualCutoffIso: null,
      actualCutoffDate: null,
      actualCutoffHour: null,
      actualCutoffMinute: null,
    }
  }

  const osloNow = getZonedDateTimeParts(now, OSLO_TIME_ZONE)
  const dayBeforeDate = shiftIsoDate(normalizedDeliveryMonday, -1)
  const collectionStart = shiftIsoDate(normalizedDeliveryMonday, -7)
  const collectionEnd = shiftIsoDate(normalizedDeliveryMonday, -1)
  const canAdd = osloNow.isoDate < normalizedDeliveryMonday
  const discountEligible = osloNow.isoDate === dayBeforeDate
  const useActualCollectedStock = discountEligible

  let actualCutoffAt: Date | null = null
  let actualCutoffIso: string | null = null
  let actualCutoffDate: string | null = null
  let actualCutoffHour: number | null = null
  let actualCutoffMinute: number | null = null

  if (useActualCollectedStock) {
    const noonCutoff = zonedDateTimeToUtc(dayBeforeDate, 12, 0, OSLO_TIME_ZONE)
    actualCutoffAt = now.getTime() < noonCutoff.getTime() ? now : noonCutoff
    actualCutoffIso = actualCutoffAt.toISOString()
    const cutoffParts = getZonedDateTimeParts(actualCutoffAt, OSLO_TIME_ZONE)
    actualCutoffDate = cutoffParts.isoDate
    actualCutoffHour = cutoffParts.hour
    actualCutoffMinute = cutoffParts.minute
  }

  return {
    canAdd,
    discountEligible,
    useActualCollectedStock,
    deliveryMonday: normalizedDeliveryMonday,
    dayBeforeDate,
    collectionStart,
    collectionEnd,
    actualCutoffAt,
    actualCutoffIso,
    actualCutoffDate,
    actualCutoffHour,
    actualCutoffMinute,
  }
}
