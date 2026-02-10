import { useMemo, useState } from 'react'
import { type Language, WeekInventory } from '@/lib/eggs/types'
import { useLanguage } from '@/lib/eggs/language-context'
import { formatDate, daysUntil, getWeekNumber } from '@/lib/eggs/utils'
import { GlassCard } from './GlassCard'
import { ChevronLeft } from 'lucide-react'

interface WeekSelectorProps {
  inventory: WeekInventory[]
  accentColor: string
  onSelectWeek: (week: WeekInventory) => void
}

type CalendarCell = {
  key: string
  date: Date | null
  day: number | null
  isEmpty: boolean
  isMonday: boolean
  weekNumber: number | null
  week: WeekInventory | null
}

type WeekSelectorCopy = {
  weekShort: string
  weekShortAbbr: string
  chooseMonth: string
  through: string
  weeks: string
  eggs: string
  eggShort: string
  backToMonths: string
  available: string
  status: string
  shipsIn: string
  days: string
  dayLabels: string[]
  statusSoldOut: string
  statusLowStock: string
  statusClosed: string
  statusLocked: string
  statusAvailable: string
  statusNotScheduled: string
}

const END_DATE = new Date('2026-08-01')

export function WeekSelector({ inventory, accentColor, onSelectWeek }: WeekSelectorProps) {
  const { language, t } = useLanguage()
  const copy = t.eggs.weekSelector as WeekSelectorCopy
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null)
  const endDateLabel = END_DATE.toLocaleDateString(language === 'no' ? 'nb-NO' : 'en-GB', {
    day: 'numeric',
    month: 'long',
  })

  const inventoryByDate = useMemo(() => {
    const map = new Map<string, WeekInventory>()
    inventory.forEach((week) => {
      map.set(dateKey(week.deliveryMonday), week)
    })
    return map
  }, [inventory])

  const months = useMemo(() => {
    const now = new Date()
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endMonth = new Date(END_DATE.getFullYear(), END_DATE.getMonth(), 1)
    const monthList: { key: string; year: number; month: number; monthDate: Date; totalEggs: number; availableWeeks: number }[] = []
    const cursor = new Date(startMonth)

    while (cursor <= endMonth) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const year = start.getFullYear()
      const month = start.getMonth()
      const mondays = getMondaysInMonth(year, month)
      const weeks = mondays.map((date) => inventoryByDate.get(dateKey(date)) || null)
      const totalEggs = weeks.reduce((sum, week) => sum + (week?.eggsAvailable || 0), 0)
      const availableWeeks = weeks.filter((week) => week && isWeekAvailable(week)).length
      monthList.push({
        key: `${year}-${month}`,
        year,
        month,
        monthDate: start,
        totalEggs,
        availableWeeks,
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return monthList
  }, [inventoryByDate])

  const activeMonth = months.find((month) => month.key === activeMonthKey) || null

  return (
    <div className="space-y-4">
      {!activeMonth ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-semibold text-neutral-900">{copy.chooseMonth}</h3>
            <span className="text-[11px] text-neutral-500">{copy.through.replace('{date}', endDateLabel)}</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible">
            {months.map((month) => {
              const cells = buildCalendarCells(month.year, month.month, inventoryByDate)
              const rows = chunk(cells, 7).filter((row) => {
                const monday = getRowMonday(row)
                return monday ? monday.getMonth() === month.month : false
              })

              return (
                <button
                  key={month.key}
                  type="button"
                  onClick={() => setActiveMonthKey(month.key)}
                  className="group min-w-[85%] snap-start text-left focus-ring rounded-xl sm:min-w-0 transition-transform duration-200 hover:-translate-y-1 will-change-transform"
                >
                  <GlassCard className="p-3 shadow-none transition-all duration-200 group-hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.3)] group-hover:border-neutral-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                        {formatMonthTitle(month.monthDate, language)}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {month.availableWeeks} {copy.weeks} - {month.totalEggs} {copy.eggs}
                      </div>
                    </div>

                    <div className="grid grid-cols-9 gap-1 text-[9px] text-neutral-400 mb-1">
                      <div className="text-center">{copy.weekShortAbbr}</div>
                      {copy.dayLabels.map((label) => (
                        <div key={label} className="text-center">
                          {label}
                        </div>
                      ))}
                      <div className="text-center">{copy.eggShort}</div>
                    </div>

                    <div className="space-y-1">
                      {rows.map((row, rowIndex) => {
                        const rowMonday = getRowMonday(row)
                        const rowWeekNumber = rowMonday ? getWeekNumber(rowMonday) : null
                        const rowWeek = rowMonday ? inventoryByDate.get(dateKey(rowMonday)) || null : null

                        return (
                          <div
                            key={`row-${month.key}-${rowIndex}`}
                            className="grid grid-cols-9 gap-1 rounded-full border border-neutral-200 bg-white/70 p-1"
                          >
                            <div className="rounded-xl bg-white/70 px-1 py-1 min-h-[24px]">
                              <div className="flex h-full items-center justify-center text-[9px] font-semibold text-neutral-500">
                                {rowWeekNumber ?? ''}
                              </div>
                            </div>

                            {row.map((cell) => (
                              <div
                                key={cell.key}
                                className={`rounded-xl px-1 py-1 min-h-[24px] ${
                                  cell.isEmpty ? 'bg-transparent' : 'bg-white/70'
                                } ${
                                  cell.isMonday
                                    ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                                    : ''
                                }`}
                              >
                                {cell.isEmpty ? null : (
                                  <div className="flex h-full flex-col justify-between">
                                    <div className="flex items-center justify-between text-[9px] text-neutral-500">
                                      <span>{cell.day}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}

                            <div className="rounded-xl bg-white/70 px-1 py-1 min-h-[24px]">
                              <div className="flex h-full items-center justify-center">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                                    rowWeek ? statusPill(rowWeek.status) : 'bg-neutral-100 text-neutral-400'
                                  }`}
                                >
                                  {rowWeek?.eggsAvailable ?? 0} {copy.eggs}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </GlassCard>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveMonthKey(null)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {copy.backToMonths}
            </button>
            <div className="text-sm font-semibold text-neutral-900">
              {formatMonthTitle(activeMonth.monthDate, language)}
            </div>
          </div>

          <h3 className="text-lg font-display font-semibold text-neutral-900">{t.breed.selectWeek}</h3>

          <div className="space-y-2">
            {chunk(buildCalendarCells(activeMonth.year, activeMonth.month, inventoryByDate), 7)
              .filter((row) => {
                const monday = getRowMonday(row)
                return monday ? monday.getMonth() === activeMonth.month : false
              })
              .map((row, rowIndex) => {
                const rowMonday = getRowMonday(row)
                const week = rowMonday ? inventoryByDate.get(dateKey(rowMonday)) || null : null
                const weekNumber = rowMonday ? week?.weekNumber || getWeekNumber(rowMonday) : null
                const isSelectable = Boolean(week && isWeekAvailable(week))

                return (
                  <button
                    key={`week-row-${activeMonth.key}-${rowIndex}`}
                    type="button"
                    onClick={() => week && isSelectable && onSelectWeek(week)}
                    disabled={!isSelectable}
                    className={`group grid w-full grid-cols-8 gap-1 rounded-xl px-1 py-1 text-left transition-all ${
                      isSelectable
                        ? 'cursor-pointer hover:bg-neutral-50'
                        : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div
                      className={`relative rounded-xl border px-2 py-2 min-h-[54px] ${
                        week ? 'border-neutral-200 bg-white' : 'border-transparent bg-transparent'
                      } ${isSelectable ? 'group-hover:bg-neutral-50' : ''}`}
                    >
                      {week ? (
                        <div className="flex h-full flex-col justify-between">
                          <div className="text-[10px] font-semibold text-neutral-600">
                            {copy.weekShort} {weekNumber ?? ''}
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              week ? statusPill(week.status) : 'bg-neutral-100 text-neutral-400'
                            }`}
                          >
                            {week?.eggsAvailable ?? 0} {copy.eggs}
                          </span>
                          <WeekTooltip
                            week={week}
                            weekNumber={weekNumber}
                            monday={rowMonday}
                            language={language}
                            copy={copy}
                          />
                        </div>
                      ) : null}
                    </div>
                    {row.map((cell) => (
                      <div
                        key={cell.key}
                        className={`rounded-xl border px-2 py-2 min-h-[54px] ${
                          cell.isEmpty ? 'border-transparent bg-transparent' : 'border-neutral-100 bg-white'
                        } ${
                          cell.isMonday
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : ''
                        } ${
                          isSelectable ? 'group-hover:bg-neutral-50' : ''
                        }`}
                      >
                        {cell.isEmpty ? null : (
                          <div className="flex h-full flex-col justify-between">
                            <div className="flex items-center justify-between text-[10px] text-neutral-500">
                              <span>{cell.day}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

function WeekTooltip({
  week,
  weekNumber,
  monday,
  language,
  copy,
}: {
  week: WeekInventory | null
  weekNumber: number | null
  monday: Date | null
  language: Language
  copy: WeekSelectorCopy
}) {
  if (!monday) return null
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const statusLabel = getStatusLabel(week?.status || null, copy)
  const eggs = week?.eggsAvailable ?? 0

  return (
    <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-52 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] text-neutral-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      <div className="font-semibold text-neutral-900">
        {copy.weekShort} {weekNumber ?? getWeekNumber(monday)}
      </div>
      <div className="text-neutral-500">
        {formatDate(monday, language)} - {formatDate(sunday, language)}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span>{copy.available}</span>
        <span className="font-semibold">{eggs}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span>{copy.status}</span>
        <span className="font-semibold">{statusLabel}</span>
      </div>
      <div className="mt-1 text-neutral-500">
        {copy.shipsIn} {daysUntil(monday)} {copy.days}
      </div>
    </div>
  )
}

function isWeekAvailable(week: WeekInventory): boolean {
  return week.status === 'available' || week.status === 'low_stock'
}

function statusPill(status: WeekInventory['status']) {
  switch (status) {
    case 'low_stock':
      return 'bg-amber-50 text-amber-700'
    case 'sold_out':
    case 'closed':
    case 'locked':
      return 'bg-neutral-100 text-neutral-400'
    default:
      return 'bg-emerald-50 text-emerald-700'
  }
}

function getStatusLabel(status: WeekInventory['status'] | null, copy: WeekSelectorCopy): string {
  if (status === 'sold_out') return copy.statusSoldOut
  if (status === 'low_stock') return copy.statusLowStock
  if (status === 'closed') return copy.statusClosed
  if (status === 'locked') return copy.statusLocked
  if (status === 'available') return copy.statusAvailable
  return copy.statusNotScheduled
}

function getRowMonday(row: CalendarCell[]): Date | null {
  if (row[0]?.date) return row[0].date
  const firstCell = row.find((cell) => cell.date)
  if (!firstCell?.date) return null
  const offset = row.indexOf(firstCell)
  const monday = new Date(firstCell.date)
  monday.setDate(firstCell.date.getDate() - offset)
  return monday
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMondaysInMonth(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const day = firstOfMonth.getDay()
  const offset = (8 - day) % 7
  const firstMonday = new Date(year, month, 1 + offset)
  const mondays: Date[] = []
  const cursor = new Date(firstMonday)

  while (cursor.getMonth() === month) {
    mondays.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  return mondays
}

function formatMonthTitle(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === 'no' ? 'nb-NO' : 'en-GB', {
    month: 'long',
  }).format(date)
}

function buildCalendarCells(
  year: number,
  month: number,
  inventoryByDate: Map<string, WeekInventory>
): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDayIndex = (firstOfMonth.getDay() + 6) % 7
  const totalCells = Math.ceil((startDayIndex + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startDayIndex + 1

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return {
        key: `${year}-${month}-empty-${index}`,
        date: null,
        day: null,
        isEmpty: true,
        isMonday: false,
        weekNumber: null,
        week: null,
      }
    }

    const date = new Date(year, month, dayNumber)
    const isMonday = date.getDay() === 1
    const week = isMonday ? inventoryByDate.get(dateKey(date)) || null : null

    return {
      key: dateKey(date),
      date,
      day: dayNumber,
      isEmpty: false,
      isMonday,
      weekNumber: isMonday ? week?.weekNumber || getWeekNumber(date) : null,
      week,
    }
  })
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}
