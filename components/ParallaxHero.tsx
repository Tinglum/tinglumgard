"use client";

import { useEffect, useState, ReactNode } from 'react';

interface ParallaxHeroProps {
  children?: ReactNode;
}

export function ParallaxHero({ children }: ParallaxHeroProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxOffset = scrollY * 0.5;

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-visible">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <svg
          className="absolute top-20 left-10 w-96 h-96"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="80" fill="url(#grad1)" opacity="0.6" />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <svg
          className="absolute top-40 right-20 w-64 h-64"
          viewBox="0 0 200 200"
          fill="none"
        >
          <rect x="40" y="40" width="120" height="120" rx="20" fill="url(#grad2)" opacity="0.4" />
          <defs>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E5E7EB" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <svg
          className="absolute bottom-20 left-1/4 w-80 h-80"
          viewBox="0 0 200 200"
          fill="none"
        >
          <ellipse cx="100" cy="100" rx="90" ry="70" fill="url(#grad3)" opacity="0.3" />
          <defs>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {children}
    </div>
  );
}
