"use client";

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function NorwayMapSection() {
  const { lang } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRef.current.clientHeight;
      const viewportHeight = window.innerHeight;

      if (rect.top < viewportHeight && rect.bottom > 0) {
        const scrollProgress = Math.max(
          0,
          Math.min(1, (viewportHeight - rect.top) / (containerHeight + viewportHeight))
        );
        setZoomLevel(scrollProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scale = 1 + zoomLevel * 4;
  const opacity = 0.3 + zoomLevel * 0.7;

  const stages = lang === 'en'
    ? [
        { label: 'Norway', progress: 0.25 },
        { label: 'Trondelag', progress: 0.5 },
        { label: 'Namdalseid', progress: 0.75 },
        { label: 'Tinglum Gard', progress: 1 },
      ]
    : [
        { label: 'Norge', progress: 0.25 },
        { label: 'Trondelag', progress: 0.5 },
        { label: 'Namdalseid', progress: 0.75 },
        { label: 'Tinglum Gard', progress: 1 },
      ];

  const nextStageIndex = stages.findIndex((stage) => zoomLevel < stage.progress);
  const currentStage = nextStageIndex === -1 ? stages.length - 1 : nextStageIndex;

  return (
    <section
      ref={containerRef}
      className="relative py-48 overflow-hidden"
      style={{ minHeight: '200vh' }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 400 800"
            className="w-full max-w-md transition-all duration-700 ease-out"
            style={{
              transform: `scale(${scale})`,
              opacity,
            }}
          >
            <g id="norway-outline">
              <path
                d="M200 50 L220 80 L210 120 L230 160 L215 200 L225 250 L210 300 L220 350 L200 400 L190 450 L200 500 L180 550 L190 600 L170 650 L180 700 L160 750 L150 720 L140 680 L130 640 L120 600 L110 560 L100 520 L90 480 L85 440 L80 400 L75 360 L70 320 L75 280 L80 240 L90 200 L100 160 L110 120 L120 80 L140 50 L200 50 Z"
                fill="none"
                stroke="white"
                strokeWidth="2"
                opacity="0.3"
              />

              {zoomLevel > 0.3 && (
                <circle
                  cx="160"
                  cy="350"
                  r={20 + zoomLevel * 40}
                  fill="white"
                  opacity={Math.min(0.1, zoomLevel * 0.3)}
                  className="transition-all duration-700"
                />
              )}

              {zoomLevel > 0.7 && (
                <circle
                  cx="160"
                  cy="350"
                  r="8"
                  fill="white"
                  opacity="0.9"
                  className="animate-pulse"
                />
              )}
            </g>
          </svg>
        </div>

        <div className="relative z-10 text-center space-y-6">
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div
                key={stage.label}
                className={`text-display transition-all duration-700 ${
                  index === currentStage
                    ? 'opacity-100 scale-100'
                    : 'opacity-20 scale-95'
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                {index === currentStage && stage.label}
              </div>
            ))}
          </div>

          {zoomLevel > 0.9 && (
            <p
              className="text-[var(--text-secondary)] text-sm animate-fade-in"
              style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}
            >
              6364 Namdalseid, Trondelag
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
