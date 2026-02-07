import { useMemo, useState } from 'react'
import { WeekInventory } from '@/lib/eggs/types'
import { useLanguage } from '@/lib/eggs/language-context'
import { formatDate, daysUntil, getWeekNumber } from '@/lib/eggs/utils'
import { GlassCard } from './GlassCard'
import { Calendar, Package, ChevronLeft } from 'lucide-react'

interface WeekSelectorProps {
  inventory: WeekInventory[]
  accentColor: string
  onSelectWeek: (week: WeekInventory) => void
}

export function WeekSelector({ inventory, accentColor, onSelectWeek }: WeekSelectorProps) {
  const { language, t } = useLanguage()
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null)

  const inventoryByDate = useMemo(() => {
    const map = new Map<string, WeekInventory>()
    inventory.forEach((week) => {
      map.set(dateKey(week.deliveryMonday), week)
    })
    return map
  }, [inventory])

  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 4 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() + index, 1)
      const year = start.getFullYear()
      const month = start.getMonth()
      const mondays = getMondaysInMonth(year, month)
      const weeks = mondays.map((date) => inventoryByDate.get(dateKey(date)) || null)
      const totalEggs = weeks.reduce((sum, week) => sum + (week?.eggsAvailable || 0), 0)
      const availableWeeks = weeks.filter((week) => week && isWeekAvailable(week)).length
      return {
        key: `${year}-${month}`,
        year,
        month,
        monthDate: start,
        mondays,
        weeks,
        totalEggs,
        availableWeeks,
      }
    })
  }, [inventoryByDate])

  const activeMonth = months.find((month) => month.key === activeMonthKey) || null

  return (
    <div className="space-y-4">
      {!activeMonth ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-semibold text-neutral-900">
              {language === 'no' ? 'Velg måned' : 'Choose month'}
            </h3>
            <span className="text-xs text-neutral-500">
              {language === 'no' ? 'Neste 4 måneder' : 'Next 4 months'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {months.map((month) => (
              <button
                key={month.key}
                type="button"
                onClick={() => setActiveMonthKey(month.key)}
                className="text-left focus-ring rounded-lg"
              >
                <GlassCard className="p-4 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-neutral-900">
                      {formatMonthTitle(month.monthDate, language)}
                    </div>
                    <div className="text-xs text-neutral-500">{month.year}</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-[10px] text-neutral-500 mb-2">
                    {getDayLabels(language).map((label) => (
                      <div key={label} className="text-center">
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-[11px]">
                    {buildCalendarCells(month.year, month.month, inventoryByDate).map((cell) => (
                      <div
                        key={cell.key}
                        className={`rounded border border-transparent px-1 py-1 ${
                          cell.isEmpty ? '' : 'bg-white/60'
                        }`}
                      >
                        {cell.isEmpty ? null : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-neutral-500">{cell.day}</span>
                            {cell.isMonday && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-neutral-700">
                                  {language === 'no' ? 'Uke' : 'Week'} {cell.weekNumber}
                                </span>
                                <span
                                  className={`text-[10px] font-medium ${
                                    cell.eggsAvailable === 0 ? 'text-neutral-400' : 'text-neutral-700'
                                  }`}
                                >
                                  {cell.eggsAvailable} {language === 'no' ? 'egg' : 'eggs'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-neutral-500">
                    {month.availableWeeks}{' '}
                    {language === 'no' ? 'uker med egg' : 'weeks with eggs'} â€¢ {month.totalEggs}{' '}
                    {language === 'no' ? 'egg tilgjengelig' : 'eggs available'}
                  </div>
                </GlassCard>
              </button>
            ))}
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
              {language === 'no' ? 'Tilbake til måneder' : 'Back to months'}
            </button>
            <div className="text-sm font-semibold text-neutral-900">
              {formatMonthTitle(activeMonth.monthDate, language)}
            </div>
          </div>

          <h3 className="text-lg font-display font-semibold text-neutral-900">{t.breed.selectWeek}</h3>

          <div className="space-y-4">
            {activeMonth.mondays.map((monday) => {
              const week = inventoryByDate.get(dateKey(monday)) || null
              const weekNumber = week?.weekNumber || getWeekNumber(monday)
              const isAvailable = week ? isWeekAvailable(week) : false
              const daysLeft = daysUntil(monday)

              return (
                <GlassCard
                  key={`${activeMonth.key}-${weekNumber}`}
                  interactive={isAvailable}
                  className={`p-4 ${!isAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <button
                    onClick={() => week && isAvailable && onSelectWeek(week)}
                    disabled={!isAvailable}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-neutral-600" />
                          <span className="text-base font-semibold text-neutral-900">
                            {t.common.week} {weekNumber}
                          </span>
                          <span className="text-sm text-neutral-600">â€¢</span>
                          <span className="text-sm text-neutral-600">{formatDate(monday, language)}</span>
                        </div>
                        <div className="text-xs text-neutral-500">
                          {language === 'no' ? 'Sendes om' : 'Ships in'} {daysLeft}{' '}
                          {language === 'no' ? 'dager' : 'days'}
                        </div>
                      </div>

                      {week ? (
                        week.status === 'sold_out' ? (
                          <span className="badge badge-neutral">{language === 'no' ? 'Utsolgt' : 'Sold out'}</span>
                        ) : week.status === 'low_stock' ? (
                          <span className="badge badge-warning">{language === 'no' ? 'FÃ¥ igjen' : 'Low stock'}</span>
                        ) : (
                          <span className="badge badge-success">{t.breed.available}</span>
                        )
                      ) : (
                        <span className="badge badge-neutral">
                          {language === 'no' ? 'Ikke planlagt' : 'Not scheduled'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Package className="w-4 h-4" />
                      <span>
                        {week?.eggsAvailable || 0} {language === 'no' ? 'egg tilgjengelig' : 'eggs available'}
                      </span>
                    </div>

                    {isAvailable && (
                      <div
                        className="mt-3 pt-3 border-t border-neutral-200 text-sm font-medium transition-colors"
                        style={{ color: accentColor }}
                      >
                        {language === 'no' ? 'Velg denne uken â†’' : 'Select this week â†’'}
                      </div>
                    )}
                  </button>
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function isWeekAvailable(week: WeekInventory): boolean {
  return week.status === 'available' || week.status === 'low_stock'
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

function getDayLabels(language: string): string[] {
  return language === 'no'
    ? ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'LÃ¸r', 'SÃ¸n']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}

function formatMonthTitle(date: Date, language: string): string {
  return new Intl.DateTimeFormat(language === 'no' ? 'nb-NO' : 'en-GB', {
    month: 'long',
  }).format(date)
}

function buildCalendarCells(
  year: number,
  month: number,
  inventoryByDate: Map<string, WeekInventory>
): Array<{
  key: string
  day: number | null
  isEmpty: boolean
  isMonday: boolean
  weekNumber: number | null
  eggsAvailable: number
}> {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDayIndex = (firstOfMonth.getDay() + 6) % 7
  const totalCells = Math.ceil((startDayIndex + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startDayIndex + 1

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return {
        key: `${year}-${month}-empty-${index}`,
        day: null,
        isEmpty: true,
        isMonday: false,
        weekNumber: null,
        eggsAvailable: 0,
      }
    }

    const date = new Date(year, month, dayNumber)
    const isMonday = date.getDay() === 1
    const week = inventoryByDate.get(dateKey(date))

    return {
      key: dateKey(date),
      day: dayNumber,
      isEmpty: false,
      isMonday,
      weekNumber: isMonday ? week?.weekNumber || getWeekNumber(date) : null,
      eggsAvailable: isMonday ? week?.eggsAvailable || 0 : 0,
    }
  })
}
