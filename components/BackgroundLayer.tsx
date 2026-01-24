'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function BackgroundLayer() {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base */}
      <div className={cn("absolute inset-0", theme.bgPrimary)} />

      {/* Gradient layer 1 */}
      <div
        className={cn("absolute -top-1/3 -left-1/3 h-[120vh] w-[120vh] rounded-full bg-gradient-to-br to-transparent blur-3xl animate-slow-fade", theme.bgGradientOrbs[0])}
      />

      {/* Gradient layer 2 */}
      <div
        className={cn("absolute top-1/4 right-[-30%] h-[90vh] w-[90vh] rounded-full bg-gradient-to-tr to-transparent blur-3xl animate-slower-fade", theme.bgGradientOrbs[1])}
      />

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)',
          backgroundSize: '4px 4px',
        }}
      />
    </div>
  );
}
