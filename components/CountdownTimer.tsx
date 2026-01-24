"use client";

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
}

export function CountdownTimer({ targetDate, label = "Levering i uke 48" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function calculateTimeLeft() {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    }

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  }

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-900 border border-green-200">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Leveringstid!</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Clock className="w-4 h-4" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex gap-2 sm:gap-4">
        <div className="flex flex-col items-center min-w-[3.5rem] px-3 py-2 bg-neutral-900 text-white">
          <span className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {timeLeft.days}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wide text-neutral-400">
            Dager
          </span>
        </div>
        <div className="flex flex-col items-center min-w-[3.5rem] px-3 py-2 bg-neutral-900 text-white">
          <span className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {timeLeft.hours}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wide text-neutral-400">
            Timer
          </span>
        </div>
        <div className="flex flex-col items-center min-w-[3.5rem] px-3 py-2 bg-neutral-900 text-white">
          <span className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {timeLeft.minutes}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wide text-neutral-400">
            Min
          </span>
        </div>
        <div className="flex flex-col items-center min-w-[3.5rem] px-3 py-2 bg-neutral-900 text-white">
          <span className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {timeLeft.seconds}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wide text-neutral-400">
            Sek
          </span>
        </div>
      </div>
    </div>
  );
}
