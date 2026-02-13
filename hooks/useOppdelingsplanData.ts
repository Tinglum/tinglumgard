import { useEffect, useState } from 'react';
import { Extra, ExtrasResponse } from '@/lib/types';

interface MangalitsaPresetContent {
  id: string;
  content_name_no: string;
  content_name_en: string;
  cut_id?: string | null;
  cut_slug?: string | null;
  part_key?: string | null;
  part_name_no?: string | null;
  part_name_en?: string | null;
  cut_description_no?: string | null;
  cut_description_en?: string | null;
  target_weight_kg?: number | null;
  quantity?: number | null;
  quantity_unit_no?: string | null;
  quantity_unit_en?: string | null;
  is_hero?: boolean;
  display_order: number;
}

interface MangalitsaPreset {
  id: string;
  slug: string;
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
