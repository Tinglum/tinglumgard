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
  const baseClasses = "bg-white border border-neutral-200 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-300";
  const hoverClasses = hover ? 'hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-1' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
}
