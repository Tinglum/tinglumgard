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
  const baseClasses = "rounded-2xl transition-all duration-300";
  const variantClasses = variant === 'strong' ? 'glass-surface-strong' : 'glass-surface';
  const hoverClasses = hover ? 'hover:bg-[var(--surface-hover)] hover:shadow-glass-hover' : '';
  const shadowClasses = 'shadow-soft';

  return (
    <div className={`${baseClasses} ${variantClasses} ${shadowClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
}
