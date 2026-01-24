'use client';

import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeTestPage() {
  const { theme, setTheme, getThemeClasses } = useTheme();
  const themeClasses = getThemeClasses();

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Theme Test Page</h1>

      {/* Current theme */}
      <div className="mb-8">
        <p className="text-lg mb-2">Current theme: <strong>{theme}</strong></p>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('warm')}
            className="px-4 py-2 bg-amber-100 rounded"
          >
            Warm
          </button>
          <button
            onClick={() => setTheme('monochrome')}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Monochrome
          </button>
          <button
            onClick={() => setTheme('nordic')}
            className="px-4 py-2 bg-blue-100 rounded"
          >
            Nordic
          </button>
        </div>
      </div>

      {/* Theme classes output */}
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Current Theme Classes:</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(themeClasses, null, 2)}
        </pre>
      </div>

      {/* Visual tests */}
      <div className="space-y-4">
        <div className={`p-4 rounded ${themeClasses.bgPrimary}`}>
          <p className={themeClasses.textPrimary}>Primary background with primary text</p>
        </div>

        <div className={`p-4 rounded ${themeClasses.bgCard}`}>
          <p className={themeClasses.textSecondary}>Card background with secondary text</p>
        </div>

        <div className={`p-4 rounded ${themeClasses.bgDark}`}>
          <p className={themeClasses.textOnDark}>Dark background with on-dark text</p>
        </div>

        <div className={`p-4 rounded ${themeClasses.buttonPrimary}`}>
          <p className="text-white">Button primary gradient</p>
        </div>

        <div className="p-4 rounded">
          <p className={themeClasses.gradientText}>Gradient text example</p>
        </div>
      </div>
    </div>
  );
}
