'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Check, Circle, Package, CreditCard, Lock, Truck, CheckCircle2 } from 'lucide-react';

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
  markedDeliveredAt,
}: OrderStatusTimelineProps) {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const steps = [
    {
      key: 'created',
      label: 'Bestilling opprettet',
      icon: Package,
      completed: true, // Always completed if order exists
    },
    {
      key: 'deposit',
      label: 'Forskudd betalt',
      icon: CreditCard,
      completed: depositPaid || status !== 'draft',
    },
    {
      key: 'remainder',
      label: 'Fullstendig betalt',
      icon: CreditCard,
      completed: remainderPaid || ['paid', 'ready_for_pickup', 'completed'].includes(status),
    },
    {
      key: 'locked',
      label: 'Ordre låst',
      icon: Lock,
      completed: !!lockedAt,
    },
    {
      key: 'ready',
      label: 'Klar for henting',
      icon: Truck,
      completed: ['ready_for_pickup', 'completed'].includes(status),
    },
    {
      key: 'completed',
      label: 'Fullført',
      icon: CheckCircle2,
      completed: status === 'completed',
    },
  ];

  // Find current step
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
                {/* Icon circle */}
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

                {/* Label */}
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

              {/* Connector line */}
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
