"use client";

import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Package, CreditCard, Lock, Truck, CheckCircle2 } from 'lucide-react';

interface OrderStatusTimelineProps {
  status: string;
  depositPaid: boolean;
  remainderPaid: boolean;
  lockedAt: string | null;
  markedDeliveredAt: string | null;
}

export function OrderStatusTimeline({
  status,
  depositPaid,
  remainderPaid,
  lockedAt,
}: OrderStatusTimelineProps) {
  const { getThemeClasses } = useTheme();
  const { t } = useLanguage();
  const theme = getThemeClasses();

  const copy = t.orderStatusTimeline;

  const steps = [
    {
      key: 'created',
      label: copy.created,
      icon: Package,
      completed: true,
    },
    {
      key: 'deposit',
      label: copy.deposit,
      icon: CreditCard,
      completed: depositPaid || status !== 'draft',
    },
    {
      key: 'remainder',
      label: copy.remainder,
      icon: CreditCard,
      completed: remainderPaid || ['paid', 'ready_for_pickup', 'completed'].includes(status),
    },
    {
      key: 'locked',
      label: copy.locked,
      icon: Lock,
      completed: !!lockedAt,
    },
    {
      key: 'ready',
      label: copy.ready,
      icon: Truck,
      completed: ['ready_for_pickup', 'completed'].includes(status),
    },
    {
      key: 'completed',
      label: copy.completed,
      icon: CheckCircle2,
      completed: status === 'completed',
    },
  ];

  const currentStepIndex = steps.findIndex((step) => !step.completed);

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.completed;
          const isCurrent = index === currentStepIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all mb-2',
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                        ? 'bg-white border-blue-500 text-blue-500 animate-pulse'
                        : 'bg-white border-gray-300 text-gray-400'
                  )}
                >
                  {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>

                <p
                  className={cn(
                    'text-xs text-center font-medium transition-colors',
                    isCompleted
                      ? theme.textPrimary
                      : isCurrent
                        ? 'text-blue-600'
                        : theme.textMuted
                  )}
                >
                  {step.label}
                </p>
              </div>

              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 -mt-8">
                  <div
                    className={cn(
                      'h-full transition-all',
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
