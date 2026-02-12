'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Bell, Mail, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationSetting {
  id: string;
  enabled: boolean;
  category: 'order' | 'payment' | 'delivery' | 'admin';
}

export function NotificationSettings() {
  const { getThemeClasses } = useTheme();
  const { t } = useLanguage();
  const copy = t.notificationSettings;
  const theme = getThemeClasses();

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'order_confirmation', enabled: true, category: 'order' },
    { id: 'deposit_paid', enabled: true, category: 'payment' },
    { id: 'remainder_reminder', enabled: true, category: 'payment' },
    { id: 'order_locked', enabled: true, category: 'order' },
    { id: 'ready_for_pickup', enabled: true, category: 'delivery' },
    { id: 'order_completed', enabled: true, category: 'order' },
    { id: 'admin_new_order', enabled: true, category: 'admin' },
    { id: 'admin_payment_received', enabled: false, category: 'admin' },
  ]);

  function toggleNotification(id: string) {
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      )
    );
  }

  const categoryIcons = {
    order: Mail,
    payment: CheckCircle,
    delivery: Bell,
    admin: Bell,
  };

  const categories = ['order', 'payment', 'delivery', 'admin'] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={cn('text-2xl font-bold', theme.textPrimary)}>{copy.title}</h2>
        <p className={cn('text-sm mt-1', theme.textSecondary)}>{copy.subtitle}</p>
      </div>

      {categories.map((category) => {
        const categoryNotifications = notifications.filter((n) => n.category === category);
        const Icon = categoryIcons[category];

        return (
          <div key={category} className={cn('p-6 rounded-xl border', theme.borderSecondary, theme.bgCard)}>
            <h3 className={cn('text-lg font-semibold mb-4 flex items-center gap-2', theme.textPrimary)}>
              <Icon className="w-5 h-5" />
              {copy.categoryLabels[category]}
            </h3>

            <div className="space-y-3">
              {categoryNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border',
                    notification.enabled ? 'border-green-200 bg-green-50/50' : 'border-neutral-200'
                  )}
                >
                  <div className="flex-1">
                    <p className={cn('font-medium', theme.textPrimary)}>
                      {copy.items[notification.id as keyof typeof copy.items].name}
                    </p>
                    <p className={cn('text-sm', theme.textMuted)}>
                      {copy.items[notification.id as keyof typeof copy.items].description}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={notification.enabled}
                      onChange={() => toggleNotification(notification.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className={cn('p-4 rounded-xl bg-blue-50 border border-blue-200')}>
        <p className="text-sm text-blue-900">
          <strong>{copy.noteLabel}</strong> {copy.noteText}
        </p>
      </div>
    </div>
  );
}
