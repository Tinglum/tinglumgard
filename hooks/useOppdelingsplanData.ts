import { useEffect, useState } from 'react';
import { Extra, BoxContents, ExtrasResponse, ConfigResponse } from '@/lib/types';

export function useOppdelingsplanData() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [boxContents, setBoxContents] = useState<BoxContents | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [extrasRes, cfgRes] = await Promise.all([
          fetch('/api/extras'),
          fetch('/api/config'),
        ]);

        const extrasJson: ExtrasResponse = await extrasRes.json();
        if (extrasJson.extras) setExtras(extrasJson.extras);

        const cfgJson: ConfigResponse = await cfgRes.json();
        if (cfgJson.box_contents) setBoxContents(cfgJson.box_contents);
      } catch (err) {
        // Error during fetch - state remains empty, graceful fallback
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { extras, boxContents, isLoading };
}
