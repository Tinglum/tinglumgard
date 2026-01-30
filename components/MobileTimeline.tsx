'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    icon: '🛒',
    date: 'Jan',
    title: 'Reserver',
    desc: 'Betal 50% nå',
  },
  {
    icon: '💰',
    date: 'Nov',
    title: 'Betal rest',
    desc: 'Uke 46',
  },
  {
    icon: '📦',
    date: 'Des',
    title: 'Motta pakken',
    desc: 'Frossen eller fersk',
  },
];

export function MobileTimeline() {
  return (
    <section className="relative py-16 px-4 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-0 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="max-w-md mx-auto">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-2">Slik fungerer det</h2>
          <p className="text-white/60">3 enkle steg</p>
        </motion.div>

        {/* Timeline steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[30px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-purple-500/50 via-blue-500/50 to-purple-500/50" />

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative flex items-center gap-4"
              >
                {/* Icon circle */}
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-16 h-16 rounded-2xl glass-mobile-strong flex items-center justify-center text-2xl shadow-lg">
                    {step.icon}
                  </div>
                </div>

                {/* Content card */}
                <div className="flex-1 glass-mobile rounded-2xl p-4 fade-in-up">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-white">{step.title}</h3>
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                      {step.date}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 glass-mobile px-6 py-3 rounded-full">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-white/80">Kun én sesong per år</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
