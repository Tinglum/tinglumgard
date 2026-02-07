import { WeekInventory } from '@/lib/eggs/types'
import { useLanguage } from '@/lib/eggs/language-context'
import { formatDate, daysUntil } from '@/lib/eggs/utils'
import { GlassCard } from './GlassCard'
import { Calendar, Package } from 'lucide-react'

interface WeekSelectorProps {
  inventory: WeekInventory[]
  accentColor: string
  onSelectWeek: (week: WeekInventory) => void
}

export function WeekSelector({ inventory, accentColor, onSelectWeek }: WeekSelectorProps) {
  const { language, t } = useLanguage()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-display font-semibold text-neutral-900">{t.breed.selectWeek}</h3>

      {inventory.map((week) => {
        const daysLeft = daysUntil(week.deliveryMonday)
        const isAvailable = week.status === 'available' || week.status === 'low_stock'

        return (
          <GlassCard
            key={week.id}
            interactive={isAvailable}
            className={`p-4 ${!isAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <button
              onClick={() => isAvailable && onSelectWeek(week)}
              disabled={!isAvailable}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-neutral-600" />
                    <span className="text-base font-semibold text-neutral-900">
                      {t.common.week} {week.weekNumber}
                    </span>
                    <span className="text-sm text-neutral-600">•</span>
                    <span className="text-sm text-neutral-600">
                      {formatDate(week.deliveryMonday, language)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {language === 'no' ? 'Sendes om' : 'Ships in'} {daysLeft}{' '}
                    {language === 'no' ? 'dager' : 'days'}
                  </div>
                </div>

                {week.status === 'sold_out' ? (
                  <span className="badge badge-neutral">{language === 'no' ? 'Utsolgt' : 'Sold out'}</span>
                ) : week.status === 'low_stock' ? (
                  <span className="badge badge-warning">{language === 'no' ? 'Få igjen' : 'Low stock'}</span>
                ) : (
                  <span className="badge badge-success">{t.breed.available}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Package className="w-4 h-4" />
                <span>
                  {week.eggsAvailable} {language === 'no' ? 'egg tilgjengelig' : 'eggs available'}
                </span>
              </div>

              {isAvailable && (
                <div
                  className="mt-3 pt-3 border-t border-neutral-200 text-sm font-medium transition-colors"
                  style={{ color: accentColor }}
                >
                  {language === 'no' ? 'Velg denne uken →' : 'Select this week →'}
                </div>
              )}
            </button>
          </GlassCard>
        )
      })}
    </div>
  )
}
