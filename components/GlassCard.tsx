"use client";

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong';
  hover?: boolean;
}

export function GlassCard({
  children,
  className = '',
  variant = 'default',
  hover = true
}: GlassCardProps) {
  const baseClasses = "farm-card bg-white border border-neutral-200 rounded transition-all duration-300";
  const hoverClasses = hover ? 'hover:border-neutral-400' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
}
