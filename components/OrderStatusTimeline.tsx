"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check } from "lucide-react";

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
  lockedAt,
  markedDeliveredAt,
}: OrderStatusTimelineProps) {
  const { t } = useLanguage();
  const copy = t.orderStatusTimeline;

  const orderedDone = true;
  const growingDone = depositPaid || ['deposit_paid', 'paid', 'ready_for_pickup', 'completed'].includes(status);
  const slaughterDone = Boolean(lockedAt) || ['paid', 'ready_for_pickup', 'completed'].includes(status);
  const deliveryDone = Boolean(markedDeliveredAt) || ['ready_for_pickup', 'completed'].includes(status);

  const steps = [
    { key: "ordered", label: copy.ordered, done: orderedDone, hint: copy.orderedHint },
    { key: "growing", label: copy.growing, done: growingDone, hint: copy.growingHint },
    { key: "slaughter", label: copy.slaughter, done: slaughterDone, hint: copy.slaughterHint },
    { key: "delivery", label: copy.delivery, done: deliveryDone, hint: copy.deliveryHint },
  ];

  const currentStepIndex = Math.max(0, steps.findIndex((step) => !step.done));

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {steps.map((step, index) => {
          const isDone = step.done;
          const isCurrent = index === currentStepIndex && !isDone;

          return (
            <div key={step.key} className="relative flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                  isDone
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : isCurrent
                    ? "border-neutral-700 bg-white text-neutral-900"
                    : "border-neutral-300 bg-white text-neutral-400"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isDone ? "text-neutral-900" : isCurrent ? "text-neutral-800" : "text-neutral-500"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-neutral-500">{step.hint}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
