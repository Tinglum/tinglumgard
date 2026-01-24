"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Lock, Truck } from 'lucide-react';
import { GlassCard } from './GlassCard';

export function TimelineModule() {
  const { t } = useLanguage();

  const milestones = [
    {
      icon: Calendar,
      week: '44',
      title: t.timeline.week44,
      description: t.timeline.week44Desc,
    },
    {
      icon: Lock,
      week: '46',
      title: t.timeline.week46,
      description: t.timeline.week46Desc,
    },
    {
      icon: Truck,
      week: '48',
      title: t.timeline.week48,
      description: t.timeline.week48Desc,
    },
  ];

  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-charcoal mb-3">
          {t.timeline.title}
        </h2>
        <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto">
          Slik fungerer prosessen fra reservasjon til levering
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {milestones.map((milestone, index) => (
          <GlassCard key={index} className="p-8 relative" hover={false}>
            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-full bg-charcoal/5 flex items-center justify-center">
                  <milestone.icon className="w-6 h-6 text-charcoal" strokeWidth={1.5} />
                </div>
                <span className="text-5xl font-medium text-charcoal/10">
                  {milestone.week}
                </span>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-charcoal">{milestone.title}</h3>
                <p className="text-sm text-muted leading-relaxed">
                  {milestone.description}
                </p>
              </div>
            </div>

            {index < milestones.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-charcoal/10" />
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
