import { useEffect, useState } from 'react';
import { Extra, ExtrasResponse } from '@/lib/types';

interface MangalitsaPresetContent {
  id: string;
  content_name_no: string;
  content_name_en: string;
  display_order: number;
}

interface MangalitsaPreset {
  id: string;
  name_no: string;
  name_en: string;
  contents?: MangalitsaPresetContent[];
}

export function useOppdelingsplanData() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [presets, setPresets] = useState<MangalitsaPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [extrasRes, presetsRes] = await Promise.all([
          fetch('/api/extras'),
          fetch('/api/mangalitsa/presets'),
        ]);

        const extrasJson: ExtrasResponse = await extrasRes.json();
        if (extrasJson.extras) setExtras(extrasJson.extras);

        const presetsJson = await presetsRes.json();
        if (presetsJson.presets) setPresets(presetsJson.presets);
      } catch (err) {
        // Error during fetch - state remains empty, graceful fallback
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { extras, presets, isLoading };
}
