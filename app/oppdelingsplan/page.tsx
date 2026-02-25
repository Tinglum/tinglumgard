"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { MobileOppdelingsplan } from '@/components/MobileOppdelingsplan';
import { PIG_CUT_POLYGONS } from '@/lib/constants/pig-diagram';
import { useOppdelingsplanData } from '@/hooks/useOppdelingsplanData';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CutBoxOption, CutOverview, CutRecipeSuggestion, PartKey, PendingAddAction } from '@/lib/oppdelingsplan/types';

const PART_BY_POLYGON_ID: Record<number, PartKey> = {
  3: 'nakke',
  5: 'kotelettkam',
  7: 'ribbeside',
  8: 'svinebog',
  9: 'skinke',
  10: 'knoke',
};

const POLYGON_ID_BY_PART: Record<Exclude<PartKey, 'unknown'>, number> = {
  nakke: 3,
  svinebog: 8,
  kotelettkam: 5,
  ribbeside: 7,
  skinke: 9,
  knoke: 10,
};

const PART_ORDER: Record<PartKey, number> = {
  nakke: 1,
  svinebog: 2,
  kotelettkam: 3,
  ribbeside: 4,
  skinke: 5,
  knoke: 6,
  unknown: 99,
};

const CUT_SLUG_TO_EXTRA_SLUG_OVERRIDES: Record<string, string> = {
  // Cuts whose extra slugs don't follow a simple convention.
  'nakkekam-coppa': 'extra-coppa',
  'ryggspekk-lardo': 'extra-spekk',
  'tomahawk-kotelett': 'extra-tomahawk',
  'koteletter-fettkappe': 'koteletter',
  'ytrefilet-ryggfilet': 'ytrefilet',
  'svinekoteletter': 'koteletter',
  'bacon-sideflesk': 'bacon',
  'ekstra-ribbe': 'ekstra_ribbe',
  'bogstek': 'bogsteik',
  'kjottdeig-grov': 'kjottdeig',
  'gryte-stekekjott': 'kjottbiter',
  'labb': 'svinelabb',
};

function normalizeTextForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    // Remove accents/diacritics for robust matching (e.g., ø/æ/å in various encodings).
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stripCutNameNoise(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/,\s*\d+(\.\d+)?\s*\w+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSizeRange(
  fromKg: number | null | undefined,
  toKg: number | null | undefined,
  lang: 'no' | 'en',
  approxLabel: string
): string | null {
  if (fromKg == null || toKg == null) return null;
  const fromValue = Number(fromKg);
  const toValue = Number(toKg);
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue)) return null;
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';
  const formattedFrom = fromValue.toLocaleString(locale, { maximumFractionDigits: 2 });
  const formattedTo = toValue.toLocaleString(locale, { maximumFractionDigits: 2 });
  return `${approxLabel} ${formattedFrom}-${formattedTo} kg`;
}

function normalizeDashes(value: string): string {
  return value.replace(/[\u2013\u2014]/g, '-');
}

function sanitizeRecipeSuggestions(value: unknown): CutRecipeSuggestion[] {
  if (!Array.isArray(value)) return [];

  const recipesBySlug = new Map<string, CutRecipeSuggestion>();

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const recipe = raw as Partial<CutRecipeSuggestion>;
    const futureSlug = String(recipe.future_slug || '').trim();
    if (!futureSlug || recipesBySlug.has(futureSlug)) continue;

    recipesBySlug.set(futureSlug, {
      title_no: recipe.title_no ?? null,
      title_en: recipe.title_en ?? null,
      description_no: recipe.description_no ?? null,
      description_en: recipe.description_en ?? null,
      future_slug: futureSlug,
    });
  }

  return Array.from(recipesBySlug.values());
}

function mergeRecipeSuggestions(
  existing: CutRecipeSuggestion[] | undefined,
  incoming: CutRecipeSuggestion[]
): CutRecipeSuggestion[] {
  const merged = new Map<string, CutRecipeSuggestion>();

  for (const recipe of existing || []) {
    if (recipe.future_slug) {
      merged.set(recipe.future_slug, recipe);
    }
  }

  for (const recipe of incoming) {
    if (recipe.future_slug && !merged.has(recipe.future_slug)) {
      merged.set(recipe.future_slug, recipe);
    }
  }

  return Array.from(merged.values());
}

function getRecipeTitle(recipe: CutRecipeSuggestion, lang: 'no' | 'en'): string {
  const preferred = lang === 'en' ? recipe.title_en : recipe.title_no;
  const fallback = lang === 'en' ? recipe.title_no : recipe.title_en;
  const title = String(preferred || fallback || recipe.future_slug || '').trim();
  return normalizeDashes(title);
}

export default function OppdelingsplanPage() {
  const { t, lang } = useLanguage();
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const diagramRef = useRef<HTMLDivElement>(null);
  const [selectedCut, setSelectedCut] = useState<number | null>(null);
  const [hoveredCut, setHoveredCut] = useState<number | null>(null);
  const { extras, presets } = useOppdelingsplanData();
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [pendingAddAction, setPendingAddAction] = useState<PendingAddAction | null>(null);

  const [draftPresetSlug, setDraftPresetSlug] = useState<string | null>(null);
  const [draftExtras, setDraftExtras] = useState<string[]>([]);
  const [draftSelectedCutKeys, setDraftSelectedCutKeys] = useState<string[]>([]);
  const [chooseBoxOpen, setChooseBoxOpen] = useState(false);
  const [pendingChooseBoxCut, setPendingChooseBoxCut] = useState<CutOverview | null>(null);

  const partMeta = useMemo(
    () => ({
      nakke: {
        name: t.oppdelingsplan.nakke,
        description: t.oppdelingsplan.nakkeDesc,
      },
      svinebog: {
        name: t.oppdelingsplan.svinebog,
        description: t.oppdelingsplan.svinebogDesc,
      },
      kotelettkam: {
        name: t.oppdelingsplan.kotelettkam,
        description: t.oppdelingsplan.kotelettkamDesc,
      },
      ribbeside: {
        name: t.oppdelingsplan.ribbeside,
        description: t.oppdelingsplan.ribbesideDesc,
      },
      skinke: {
        name: t.oppdelingsplan.skinke,
        description: t.oppdelingsplan.skinkeDesc,
      },
      knoke: {
        name: t.oppdelingsplan.knoke,
        description: t.oppdelingsplan.knokeDesc,
      },
      unknown: {
        name: t.oppdelingsplan.unknownPartName,
        description: '',
      },
    }),
    [lang, t]
  );

  const allCutsOverview = useMemo<CutOverview[]>(() => {
    const map = new Map<string, CutOverview>();

    const getNormalizedCutName = (value: string): string =>
      normalizeTextForMatch(stripCutNameNoise(String(value || '')));

    const findExistingKey = (
      candidateCutId: string | null,
      candidateCutSlug: string | null,
      candidateName: string,
      candidatePartKey: PartKey
    ): string | null => {
      const entries = Array.from(map.entries());

      if (candidateCutId) {
        for (const [entryKey, entry] of entries) {
          if (entry.cut_id && entry.cut_id === candidateCutId) return entryKey;
        }
      }

      if (candidateCutSlug) {
        for (const [entryKey, entry] of entries) {
          if (entry.cut_slug && entry.cut_slug === candidateCutSlug) return entryKey;
        }
      }

      const normalizedCandidateName = getNormalizedCutName(candidateName);
      if (!normalizedCandidateName) return null;

      for (const [entryKey, entry] of entries) {
        if (entry.partKey !== candidatePartKey) continue;
        const normalizedExistingName = getNormalizedCutName(entry.name);
        if (normalizedExistingName && normalizedExistingName === normalizedCandidateName) {
          return entryKey;
        }
      }

      return null;
    };

    for (const preset of presets) {
      const presetName = lang === 'en' ? preset.name_en : preset.name_no;
      const contents = (preset.contents || []).slice().sort((a, b) => a.display_order - b.display_order);

      for (const content of contents) {
        const cutName = lang === 'en' ? content.content_name_en : content.content_name_no;
        if (!cutName) continue;

        const cutId = content.cut_id || null;
        const cutSlug = content.cut_slug || null;
        const rawPartKey = (content.part_key || 'unknown') as PartKey;
        const partKey: PartKey = rawPartKey in PART_ORDER ? rawPartKey : 'unknown';
        const partName = lang === 'en'
          ? content.part_name_en || content.part_name_no || partMeta[partKey].name
          : content.part_name_no || partMeta[partKey].name;
        const cutDescription = lang === 'en'
          ? content.cut_description_en || ''
          : content.cut_description_no || '';
        const preferredKey = cutId || cutSlug || cutName;
        const existingKey = map.has(preferredKey)
          ? preferredKey
          : findExistingKey(cutId, cutSlug, cutName, partKey);

        const boxLabel = content.target_weight_kg
          ? `${presetName} (${content.target_weight_kg} kg)`
          : presetName;

        const boxOption: CutBoxOption = {
          preset_id: preset.id,
          preset_slug: preset.slug,
          preset_name: presetName,
          target_weight_kg: content.target_weight_kg ?? null,
          label: boxLabel,
        };

        if (!existingKey) {
          map.set(preferredKey, {
            key: preferredKey,
            cut_id: cutId,
            cut_slug: cutSlug,
            extra_slug: null,
            name: cutName,
            description: cutDescription,
            sizeFromKg: content.cut_size_from_kg ?? null,
            sizeToKg: content.cut_size_to_kg ?? null,
            partKey,
            partName,
            boxOptions: [boxOption],
            recipeSuggestions: [],
          });
          continue;
        }

        const existing = map.get(existingKey)!;
        if (!existing.cut_id && cutId) {
          existing.cut_id = cutId;
        }
        if (!existing.cut_slug && cutSlug) {
          existing.cut_slug = cutSlug;
        }
        if (existing.sizeFromKg == null && content.cut_size_from_kg != null) {
          existing.sizeFromKg = content.cut_size_from_kg;
        }
        if (existing.sizeToKg == null && content.cut_size_to_kg != null) {
          existing.sizeToKg = content.cut_size_to_kg;
        }
        if (!existing.boxOptions.some((option) => option.preset_slug === preset.slug)) {
          existing.boxOptions.push(boxOption);
        }
      }
    }

    // Merge in extras (cuts that can be ordered as add-ons), so "Alle stykker" and the diagram
    // can show both: included-in-box cuts and extra-only cuts.
    for (const extra of extras as any[]) {
      const cutSlug = (extra.cut_slug || '').trim() || null;
      const cutId = extra.cut_id || null;
      const preferredKey = cutId || cutSlug || extra.slug;
      if (!preferredKey) continue;

      const rawPartKey = (extra.part_key || 'unknown') as PartKey;
      const partKey: PartKey = rawPartKey in PART_ORDER ? rawPartKey : 'unknown';
      const partName = lang === 'en'
        ? extra.part_name_en || extra.part_name_no || partMeta[partKey].name
        : extra.part_name_no || partMeta[partKey].name;

      const extraName = lang === 'en' && extra.name_en ? extra.name_en : extra.name_no;
      const extraDescription = lang === 'en'
        ? extra.description_en || extra.cut_description_en || ''
        : extra.description_no || extra.cut_description_no || '';
      const recipeSuggestions = sanitizeRecipeSuggestions(extra.recipe_suggestions);
      const normalizedExtraName = String(extraName || '').trim() || extra.slug;
      const existingKey = map.has(preferredKey)
        ? preferredKey
        : findExistingKey(cutId, cutSlug, normalizedExtraName, partKey);

      if (!existingKey) {
        map.set(preferredKey, {
          key: preferredKey,
          cut_id: cutId,
          cut_slug: cutSlug,
          extra_slug: extra.slug,
          name: normalizedExtraName,
          description: String(extraDescription || '').trim(),
          sizeFromKg: extra.cut_size_from_kg ?? null,
          sizeToKg: extra.cut_size_to_kg ?? null,
          partKey,
          partName,
          boxOptions: [],
          recipeSuggestions,
        });
        continue;
      }

      const existing = map.get(existingKey)!;
      if (!existing.cut_id && cutId) existing.cut_id = cutId;
      if (!existing.cut_slug && cutSlug) existing.cut_slug = cutSlug;
      if (!existing.extra_slug) existing.extra_slug = extra.slug;
      if (!existing.name && normalizedExtraName) existing.name = normalizedExtraName;
      if (!existing.description && extraDescription) existing.description = String(extraDescription || '').trim();
      if (existing.sizeFromKg == null && extra.cut_size_from_kg != null) {
        existing.sizeFromKg = extra.cut_size_from_kg;
      }
      if (existing.sizeToKg == null && extra.cut_size_to_kg != null) {
        existing.sizeToKg = extra.cut_size_to_kg;
      }
      if (existing.partKey === 'unknown' && partKey !== 'unknown') {
        existing.partKey = partKey;
        existing.partName = partName;
      }
      if (recipeSuggestions.length > 0) {
        existing.recipeSuggestions = mergeRecipeSuggestions(existing.recipeSuggestions, recipeSuggestions);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const partDelta = PART_ORDER[a.partKey] - PART_ORDER[b.partKey];
      if (partDelta !== 0) return partDelta;
      return a.name.localeCompare(b.name);
    });
  }, [extras, lang, partMeta, presets]);

  const selectedPartKey = selectedCut ? PART_BY_POLYGON_ID[selectedCut] || null : null;
  const selectedPartCuts = useMemo(
    () => (selectedPartKey ? allCutsOverview.filter((cut) => cut.partKey === selectedPartKey) : []),
    [allCutsOverview, selectedPartKey]
  );
  const selectedPartName = selectedPartKey ? (selectedPartCuts[0]?.partName || partMeta[selectedPartKey].name) : '';
  const selectedPartDescription = selectedPartKey ? partMeta[selectedPartKey].description : '';
  const hoveredPartName = hoveredCut ? partMeta[PART_BY_POLYGON_ID[hoveredCut] || 'unknown'].name : null;
  const filteredCutsOverview = useMemo(
    () => (selectedPartKey ? allCutsOverview.filter((cut) => cut.partKey === selectedPartKey) : allCutsOverview),
    [allCutsOverview, selectedPartKey]
  );

  const inBoxSummary: string[] = Array.from(
    new Set(
      presets
        .flatMap((preset) =>
          (preset.contents || []).map((content) => {
            const presetName = lang === 'en' ? preset.name_en : preset.name_no;
            const contentName = lang === 'en' ? content.content_name_en : content.content_name_no;
            return `${presetName}: ${contentName}`;
          })
        )
    )
  );

  const canOrderSummary: Array<{ slug: string; name: string; sizeFromKg?: number | null; sizeToKg?: number | null }> = extras.length > 0
    ? extras.map((extra) => {
        const englishName = (extra as any).name_en;
        return {
          slug: extra.slug,
          name: lang === 'en' && englishName ? englishName : extra.name_no,
          sizeFromKg: (extra as any).cut_size_from_kg ?? null,
          sizeToKg: (extra as any).cut_size_to_kg ?? null,
        };
      })
    : [];

  const activeOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    if (orders.length === 1) return orders[0];
    if (!activeOrderId) return null;
    return orders.find((order) => order.id === activeOrderId) || null;
  }, [activeOrderId, orders]);

  useEffect(() => {
    if (!orders || orders.length === 0) {
      if (activeOrderId !== null) setActiveOrderId(null);
      return;
    }

    const selectedOrderStillExists = activeOrderId
      ? orders.some((order) => order.id === activeOrderId)
      : false;

    if (!selectedOrderStillExists) {
      setActiveOrderId(orders[0].id);
    }
  }, [orders, activeOrderId]);

  const activeOrderLine = activeOrder
    ? t.oppdelingsplan.addingToOrderOrderLine
      .replace('{orderNumber}', activeOrder.order_number)
      .replace(
        '{box}',
        (lang === 'en' ? activeOrder.display_box_name_en : activeOrder.display_box_name_no) ||
          t.oppdelingsplan.unknownBoxName
      )
    : t.oppdelingsplan.chooseOrderPrompt;

  const hasMultipleOrders = orders.length > 1;
  const draftPresetDisplayName = useMemo(() => {
    if (!draftPresetSlug) return null;
    const preset = presets.find((candidate) => candidate.slug === draftPresetSlug);
    if (!preset) return draftPresetSlug;
    return lang === 'en' ? preset.name_en : preset.name_no;
  }, [draftPresetSlug, lang, presets]);

  function resolveExtraSlugForCut(cut: Pick<CutOverview, 'cut_slug' | 'name'>): string | null {
    const cutSlug = (cut.cut_slug || '').trim();
    const candidates: string[] = [];

    if (cutSlug) {
      const override = CUT_SLUG_TO_EXTRA_SLUG_OVERRIDES[cutSlug];
      if (override) candidates.push(override);
      candidates.push(cutSlug);
      candidates.push(cutSlug.replace(/-/g, '_'));
      candidates.push(cutSlug.replace(/_/g, '-'));
      candidates.push(`extra-${cutSlug}`);
    }

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (extras.some((extra) => extra.slug === candidate)) return candidate;
    }

    // Name-based fallback (helps when slugs diverge).
    const normalizedCutName = normalizeTextForMatch(stripCutNameNoise(cut.name));
    if (!normalizedCutName) return null;

    const match = extras.find((extra) => {
      const extraName = lang === 'en' && (extra as any).name_en ? (extra as any).name_en : extra.name_no;
      const normalizedExtraName = normalizeTextForMatch(stripCutNameNoise(String(extraName || '')));

      return (
        normalizedExtraName.includes(normalizedCutName) ||
        normalizedCutName.includes(normalizedExtraName)
      );
    });

    return match?.slug || null;
  }

  function getBoxPresetSlugsForCut(cut: CutOverview): string[] {
    return Array.from(new Set(cut.boxOptions.map((option) => option.preset_slug).filter(Boolean)));
  }

  function renderRecipeLinks(cut: CutOverview, keyPrefix: string, className?: string) {
    const recipeSuggestions = cut.recipeSuggestions || [];
    if (recipeSuggestions.length === 0) return null;

    return (
      <div className={cn(className)}>
        <p className="text-xs font-light uppercase tracking-wider text-neutral-600 mb-2">
          {t.oppdelingsplan.recipesShort}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {recipeSuggestions.map((recipe) => (
            <Link
              key={`${keyPrefix}-${recipe.future_slug}`}
              href={`/oppskrifter/${recipe.future_slug}`}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-light text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900"
            >
              {getRecipeTitle(recipe, lang)}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  function addCutToDraft(cut: CutOverview) {
    setDraftSelectedCutKeys((previous) => Array.from(new Set([...previous, cut.key])));

    const boxPresetSlugs = getBoxPresetSlugsForCut(cut);

    if (!draftPresetSlug) {
      if (boxPresetSlugs.length === 1) {
        const boxName = cut.boxOptions.find((option) => option.preset_slug === boxPresetSlugs[0])?.preset_name || boxPresetSlugs[0];
        setDraftPresetSlug(boxPresetSlugs[0]);
        toast({
          title: t.oppdelingsplan.addedToDraftTitle,
          description: t.oppdelingsplan.addedToDraftBox.replace('{box}', boxName),
        });
        return;
      }

      if (boxPresetSlugs.length > 1) {
        setPendingChooseBoxCut(cut);
        setChooseBoxOpen(true);
        return;
      }
    }

    if (draftPresetSlug && boxPresetSlugs.includes(draftPresetSlug)) {
      const boxName = cut.boxOptions.find((option) => option.preset_slug === draftPresetSlug)?.preset_name || draftPresetSlug;
      toast({
        title: t.oppdelingsplan.addedToDraftTitle,
        description: t.oppdelingsplan.addedToDraftIncluded.replace('{box}', boxName),
      });
      return;
    }

    const extraSlug = cut.extra_slug || resolveExtraSlugForCut(cut);
    if (!extraSlug) {
      toast({
        title: t.oppdelingsplan.couldNotAddTitle,
        description: t.oppdelingsplan.couldNotAddNoExtra,
      });
      return;
    }

    setDraftExtras((previous) => Array.from(new Set([...previous, extraSlug])));
    toast({
      title: t.oppdelingsplan.addedToDraftTitle,
      description: t.oppdelingsplan.addedToDraftAsExtra,
    });
  }

  function addExtraToDraft(extraSlug: string) {
    setDraftExtras((previous) => Array.from(new Set([...previous, extraSlug])));
    toast({
      title: t.oppdelingsplan.addedToDraftTitle,
      description: t.oppdelingsplan.addedToDraftAsExtra,
    });
  }

  async function addExtraToExistingOrder(extraSlug: string, extraName?: string) {
    if (!activeOrder) return;

    const existingExtras = Array.isArray(activeOrder.extra_products) ? activeOrder.extra_products : [];
    const existing = existingExtras.find((item: any) => item?.slug === extraSlug);

    const extraCatalogItem = extras.find((extra) => extra.slug === extraSlug) as any;
    const step = extraCatalogItem?.pricing_type === 'per_kg' ? 0.5 : 1;
    const defaultQty = Number(extraCatalogItem?.default_quantity) > 0 ? Number(extraCatalogItem.default_quantity) : step;
    const nextQty = existing?.quantity
      ? Math.round((Number(existing.quantity) + step) * 10) / 10
      : defaultQty;

    const merged: Array<{ slug: string; quantity: number }> = existingExtras
      .filter((item: any) => item?.slug)
      .map((item: any) => ({
        slug: String(item.slug),
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      }));

    const mergedIndex = merged.findIndex((item) => item.slug === extraSlug);
    if (mergedIndex >= 0) {
      merged[mergedIndex] = { slug: extraSlug, quantity: nextQty };
    } else {
      merged.push({ slug: extraSlug, quantity: nextQty });
    }

    try {
      const response = await fetch(`/api/orders/${activeOrder.id}/add-extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extras: merged }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add extra');
      }

      // Update local order snapshot for subsequent additions.
      setOrders((previous) =>
        previous.map((order) => (order.id === activeOrder.id ? { ...order, ...(data.order || {}) } : order))
      );

      toast({
        title: t.oppdelingsplan.addedToOrderTitle,
        description: t.oppdelingsplan.addedToOrderDesc.replace('{item}', extraName || extraSlug),
      });
    } catch (error) {
      toast({
        title: t.oppdelingsplan.couldNotAddTitle,
        description: t.oppdelingsplan.couldNotAddOrder,
      });
    }
  }

  function handleAddCut(cut: CutOverview) {
    if (authLoading) return;

    if (!isAuthenticated) {
      const returnTo = `/oppdelingsplan?add=${encodeURIComponent(cut.cut_slug || cut.key)}`;
      window.location.href = `/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    if (ordersLoading) {
      toast({ title: t.oppdelingsplan.loadingOrdersTitle });
      return;
    }

    if (orders.length > 0) {
      if (hasMultipleOrders && !activeOrder) {
        setPendingAddAction({ kind: 'cut', cut });
        setOrderPickerOpen(true);
        return;
      }

      const extraSlug = resolveExtraSlugForCut(cut);
      if (!extraSlug) {
        toast({
          title: t.oppdelingsplan.couldNotAddTitle,
          description: t.oppdelingsplan.couldNotAddNoExtra,
        });
        return;
      }

      void addExtraToExistingOrder(extraSlug, cut.name);
      return;
    }

    addCutToDraft(cut);
  }

  function handleAddExtra(extraSlug: string, extraName: string) {
    if (authLoading) return;

    if (!isAuthenticated) {
      const returnTo = `/oppdelingsplan?add=${encodeURIComponent(extraSlug)}`;
      window.location.href = `/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    if (ordersLoading) {
      toast({ title: t.oppdelingsplan.loadingOrdersTitle });
      return;
    }

    if (orders.length > 0) {
      if (hasMultipleOrders && !activeOrder) {
        setPendingAddAction({ kind: 'extra', extraSlug, extraName });
        setOrderPickerOpen(true);
        return;
      }

      void addExtraToExistingOrder(extraSlug, extraName);
      return;
    }

    addExtraToDraft(extraSlug);
  }

  function buildCheckoutHref(): string | null {
    const extrasParams = draftExtras.map((slug) => `extra=${encodeURIComponent(slug)}`).join('&');
    const base = draftPresetSlug
      ? `/bestill?preset=${encodeURIComponent(draftPresetSlug)}${extrasParams ? `&${extrasParams}` : ''}`
      : `/bestill?chooseBox=1${extrasParams ? `&${extrasParams}` : ''}`;

    return base;
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setOrders([]);
      setActiveOrderId(null);
      return;
    }

    let cancelled = false;
    setOrdersLoading(true);

    fetch('/api/orders')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to load orders');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
      })
      .catch(() => {
        if (cancelled) return;
        setOrders([]);
      })
      .finally(() => {
        if (cancelled) return;
        setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const queuedAdd = searchParams.get('add');
    if (!queuedAdd) return;
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (ordersLoading) return;

    const decoded = queuedAdd.trim();
    if (!decoded) return;

    const cut = allCutsOverview.find(
      (candidate) => candidate.cut_slug === decoded || candidate.cut_id === decoded || candidate.key === decoded
    );
    if (cut) {
      handleAddCut(cut);
      router.replace('/oppdelingsplan');
      return;
    }

    const extra = canOrderSummary.find((candidate) => candidate.slug === decoded);
    if (extra) {
      handleAddExtra(extra.slug, extra.name);
      router.replace('/oppdelingsplan');
    }
  }, [
    allCutsOverview,
    authLoading,
    canOrderSummary,
    isAuthenticated,
    ordersLoading,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!pendingAddAction) return;
    if (!activeOrder) return;
    if (orderPickerOpen) return;

    const action = pendingAddAction;
    setPendingAddAction(null);

    if (action.kind === 'cut') {
      handleAddCut(action.cut);
      return;
    }

    handleAddExtra(action.extraSlug, action.extraName);
  }, [activeOrder, orderPickerOpen, pendingAddAction]);

  function renderOverlays() {
    return (
      <>
        <Dialog
          open={orderPickerOpen}
          onOpenChange={(open) => {
            setOrderPickerOpen(open);
            if (!open) {
              setPendingAddAction(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-[family:var(--font-playfair)] font-normal text-neutral-900">
                {t.oppdelingsplan.chooseOrderTitle}
              </DialogTitle>
              <DialogDescription className="text-neutral-600 font-light">
                {t.oppdelingsplan.chooseOrderDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {orders.map((order) => {
                const boxName = lang === 'en' ? order.display_box_name_en : order.display_box_name_no;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      setActiveOrderId(order.id);
                      setOrderPickerOpen(false);
                    }}
                    className="w-full text-left rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          #{order.order_number}
                        </p>
                        <p className="text-xs font-light text-neutral-600 truncate">
                          {boxName || t.oppdelingsplan.unknownBoxName}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={chooseBoxOpen}
          onOpenChange={(open) => {
            setChooseBoxOpen(open);
            if (!open) {
              setPendingChooseBoxCut(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-[family:var(--font-playfair)] font-normal text-neutral-900">
                {t.oppdelingsplan.chooseBoxTitle}
              </DialogTitle>
              <DialogDescription className="text-neutral-600 font-light">
                {t.oppdelingsplan.chooseBoxDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {(pendingChooseBoxCut?.boxOptions || []).map((option) => (
                <button
                  key={`choose-box-${option.preset_slug}`}
                  type="button"
                  onClick={() => {
                    setDraftPresetSlug(option.preset_slug);
                    setChooseBoxOpen(false);
                    setPendingChooseBoxCut(null);
                    toast({
                      title: t.oppdelingsplan.addedToDraftTitle,
                      description: t.oppdelingsplan.addedToDraftBox.replace('{box}', option.preset_name),
                    });
                  }}
                  className="w-full text-left rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{option.preset_name}</p>
                      {option.target_weight_kg ? (
                        <p className="text-xs font-light text-neutral-600 truncate">
                          {t.oppdelingsplan.boxWeightHint.replace('{kg}', String(option.target_weight_kg))}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {orders.length > 0 && (
          <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl">
            <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-5 py-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                    {t.oppdelingsplan.addingToOrderLabel}
                  </p>
                  <p className="text-sm font-light text-neutral-700 truncate">
                    {activeOrderLine}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {orders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setOrderPickerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
                    >
                      {t.oppdelingsplan.changeOrder}
                    </button>
                  )}
                  <Link
                    href="/min-side"
                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-neutral-800 transition-colors"
                  >
                    {t.oppdelingsplan.viewOrder}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {orders.length === 0 && (draftPresetSlug || draftExtras.length > 0) && (
          <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl">
            <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-5 py-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                    {t.oppdelingsplan.draftSelectionLabel}
                  </p>
                  <p className="text-sm font-light text-neutral-700">
                    {draftPresetSlug
                      ? t.oppdelingsplan.draftSelectedBox.replace('{box}', draftPresetDisplayName || draftPresetSlug)
                      : t.oppdelingsplan.draftNoBoxSelected}
                    {draftExtras.length > 0
                      ? ` \u2022 ${t.oppdelingsplan.draftExtrasCount.replace('{count}', String(draftExtras.length))}`
                      : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPresetSlug(null);
                      setDraftExtras([]);
                      setDraftSelectedCutKeys([]);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
                  >
                    {t.oppdelingsplan.clearDraft}
                  </button>

                  <Link
                    href={buildCheckoutHref() || '/bestill'}
                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-neutral-800 transition-colors"
                  >
                    {t.oppdelingsplan.goToCheckout}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[#F6F4EF] text-[#1E1B16]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#E4F1F0] blur-3xl" />
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-[#F4D7C1] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-[#D9E6D6] blur-3xl" />
        </div>
        <div className="mx-auto max-w-md px-5 pb-24 pt-6 font-[family:var(--font-manrope)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.back}
          </Link>

          <MobileOppdelingsplan
            inBoxSummary={inBoxSummary}
            canOrderSummary={canOrderSummary}
            cuts={allCutsOverview}
            onAddCut={handleAddCut}
            onAddExtra={handleAddExtra}
          />
        </div>
        {renderOverlays()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/3 right-1/3 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.12 : 0}px)`,
            transition: 'transform 0.05s linear',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <Link href="/" className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300 mb-12">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.nav.backToHome}
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-4 font-[family:var(--font-playfair)]">
            {t.oppdelingsplan.title}
          </h1>
          <p className="text-base font-light text-neutral-600 max-w-3xl mx-auto">
            {t.oppdelingsplan.subtitle}
          </p>
        </div>

        <div
          ref={diagramRef}
          className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]"
        >
          <div className="relative px-8 py-6 bg-neutral-900">
            <div className="relative w-full aspect-[16/9] max-w-5xl mx-auto">
              <Image
                src="/pig-diagram3.png"
                alt={t.oppdelingsplan.diagramAlt}
                fill
                sizes="(min-width: 1024px) 800px, 100vw"
                className="object-contain"
                priority
              />

              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {PIG_CUT_POLYGONS.map((polygon) => {
                  const isSelected = selectedCut === polygon.id;
                  const isHovered = hoveredCut === polygon.id;
                  const isActive = isSelected || isHovered;

                  return (
                    <polygon
                      key={`${polygon.id}-${polygon.points}`}
                      points={polygon.points}
                      fill={isSelected ? 'rgba(255,255,255,0.28)' : isHovered ? 'rgba(255,255,255,0.18)' : 'transparent'}
                      stroke={isActive ? 'rgba(255,255,255,0.7)' : 'transparent'}
                      strokeWidth="0.6"
                      className="pointer-events-auto cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedCut((previous) => (previous === polygon.id ? null : polygon.id))}
                      onMouseEnter={() => setHoveredCut(polygon.id)}
                      onMouseLeave={() => setHoveredCut(null)}
                      aria-label={polygon.ariaLabel}
                    />
                  );
                })}
              </svg>

              {hoveredCut && hoveredPartName && !selectedCut && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-xl shadow-[0_15px_40px_-12px_rgba(0,0,0,0.3)] px-6 py-3 pointer-events-none z-10 bg-white border border-neutral-200">
                  <p className="text-sm font-light text-neutral-900">{hoveredPartName}</p>
                </div>
              )}
            </div>
          </div>

          {selectedPartKey ? (
            <div className="border-t-2 border-neutral-200 p-10 animate-fade-in bg-white">
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] max-w-4xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-3xl font-normal text-neutral-900 mb-3 font-[family:var(--font-playfair)]">
                    {selectedPartName}
                  </h3>
                  {selectedPartDescription && (
                    <p className="text-base font-light text-neutral-600 leading-relaxed">
                      {selectedPartDescription}
                    </p>
                  )}
                </div>

                {selectedPartCuts.length > 0 ? (
                  <div className="space-y-6">
                    <ul className="space-y-4">
                      {selectedPartCuts.map((cut) => (
                        <li key={`selected-cut-detail-${cut.key}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-normal text-neutral-900 mb-1">{cut.name}</p>
                              {cut.description && (
                                <p className="text-sm font-light text-neutral-600 mb-2 leading-relaxed">{cut.description}</p>
                              )}
                              {formatSizeRange(cut.sizeFromKg, cut.sizeToKg, lang, t.common.approx) && (
                                <p className="text-xs font-light text-neutral-500">
                                  {formatSizeRange(cut.sizeFromKg, cut.sizeToKg, lang, t.common.approx)}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddCut(cut)}
                              className="shrink-0 inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-md bg-neutral-900 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-neutral-800 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              {t.oppdelingsplan.addToOrder}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {cut.boxOptions.length > 0 ? (
                              cut.boxOptions.map((option, idx) => (
                                <span key={`${cut.key}-box-${idx}`} className="text-xs bg-white text-neutral-700 px-2 py-1 rounded-lg border border-neutral-200 font-light">
                                  {option.label}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs bg-white text-neutral-700 px-2 py-1 rounded-lg border border-neutral-200 font-light">
                                {t.oppdelingsplan.onlyAsExtra}
                              </span>
                            )}
                          </div>
                          {renderRecipeLinks(cut, `selected-${cut.key}`, 'mt-3')}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm font-light text-neutral-600">{t.oppdelingsplan.noProductsInBox}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t-2 border-neutral-200 p-16 text-center bg-white">
              <svg className="w-20 h-20 mx-auto mb-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-lg font-light text-neutral-600">{t.oppdelingsplan.clickForInfo}</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div className="text-center flex-1">
              <h2 className="text-3xl font-light text-neutral-900">{t.oppdelingsplan.allCuts}</h2>
              {selectedPartKey && (
                <p className="mt-2 text-sm font-light text-neutral-600">
                  {t.oppdelingsplan.filteredBy.replace('{part}', selectedPartName)}
                </p>
              )}
            </div>

            {selectedPartKey && (
              <button
                type="button"
                onClick={() => setSelectedCut(null)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
              >
                {t.oppdelingsplan.clearFilter}
              </button>
            )}
          </div>

          {filteredCutsOverview.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCutsOverview.map((cut) => {
                const isDraftSelected = draftSelectedCutKeys.includes(cut.key);
                const polygonId = cut.partKey !== 'unknown' ? POLYGON_ID_BY_PART[cut.partKey] : null;

                return (
                  <div
                    key={cut.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (polygonId) {
                        setSelectedCut(polygonId);
                        diagramRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (polygonId) {
                          setSelectedCut(polygonId);
                          diagramRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                    className={cn(
                      'p-6 rounded-xl border-2 text-left transition-all duration-300 cursor-pointer',
                      isDraftSelected
                        ? 'border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.12)]'
                        : 'border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1'
                    )}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <h3 className="min-w-0 text-xl font-normal text-neutral-900">{cut.name}</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCut(cut);
                        }}
                        className="shrink-0 inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-md bg-neutral-900 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-neutral-800 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        {t.oppdelingsplan.addToOrder}
                      </button>
                    </div>

                    {cut.description && (
                      <p className="text-sm font-light text-neutral-700 mb-3 leading-relaxed">{cut.description}</p>
                    )}
                    <p className="text-xs font-light text-neutral-500 mb-4">
                      {t.oppdelingsplan.fromPigPartLabel} {cut.partName}
                    </p>
                    {formatSizeRange(cut.sizeFromKg, cut.sizeToKg, lang, t.common.approx) && (
                      <p className="text-xs font-light text-neutral-500 mb-4">
                        {formatSizeRange(cut.sizeFromKg, cut.sizeToKg, lang, t.common.approx)}
                      </p>
                    )}
                    <div className="space-y-3">
                      {cut.boxOptions.length > 0 ? (
                        <div>
                          <p className="text-xs font-light uppercase tracking-wider text-neutral-600 mb-2">{t.oppdelingsplan.inBoxShort}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cut.boxOptions.map((option, index) => (
                              <span key={`${cut.key}-${index}`} className="text-xs bg-neutral-50 text-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 font-light">
                                {option.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-light uppercase tracking-wider text-neutral-600 mb-2">{t.oppdelingsplan.extraShort}</p>
                          <p className="text-sm font-light text-neutral-700">{t.oppdelingsplan.onlyAsExtra}</p>
                        </div>
                      )}
                      {renderRecipeLinks(cut, `allcuts-${cut.key}`)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center">{t.oppdelingsplan.noCutsLoaded}</p>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-10 mt-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light text-neutral-900 mb-10 text-center">{t.oppdelingsplan.ourProducts}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-xl font-normal mb-6 flex items-center gap-3 text-neutral-900">
                <svg className="w-6 h-6 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t.oppdelingsplan.inBox}
              </h3>
              <p className="text-sm font-light text-neutral-600 mb-6">{t.oppdelingsplan.inBoxDesc}</p>
              <div className="space-y-3">
                {inBoxSummary.map((product) => (
                  <div key={product} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                    <svg className="w-5 h-5 text-neutral-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-light text-neutral-900">{product}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-normal mb-6 flex items-center gap-3 text-neutral-900">
                <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t.oppdelingsplan.canOrder}
              </h3>
              <p className="text-sm font-light text-neutral-600 mb-6">{t.oppdelingsplan.canOrderDesc}</p>
              <div className="space-y-3">
                {canOrderSummary.map((product) => (
                  <div key={product.slug} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <svg className="w-5 h-5 text-neutral-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <div>
                        <p className="font-light text-neutral-900">{product.name}</p>
                        {formatSizeRange(product.sizeFromKg, product.sizeToKg, lang, t.common.approx) && (
                          <p className="text-xs font-light text-neutral-500 mt-1">
                            {formatSizeRange(product.sizeFromKg, product.sizeToKg, lang, t.common.approx)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddExtra(product.slug, product.name)}
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-700 hover:text-neutral-900 hover:border-neutral-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {t.oppdelingsplan.orderAsExtra}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={orderPickerOpen}
        onOpenChange={(open) => {
          setOrderPickerOpen(open);
          if (!open) {
            setPendingAddAction(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-[family:var(--font-playfair)] font-normal text-neutral-900">
              {t.oppdelingsplan.chooseOrderTitle}
            </DialogTitle>
            <DialogDescription className="text-neutral-600 font-light">
              {t.oppdelingsplan.chooseOrderDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {orders.map((order) => {
              const boxName = lang === 'en' ? order.display_box_name_en : order.display_box_name_no;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setActiveOrderId(order.id);
                    setOrderPickerOpen(false);
                  }}
                  className="w-full text-left rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        #{order.order_number}
                      </p>
                      <p className="text-xs font-light text-neutral-600 truncate">
                        {boxName || t.oppdelingsplan.unknownBoxName}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chooseBoxOpen}
        onOpenChange={(open) => {
          setChooseBoxOpen(open);
          if (!open) {
            setPendingChooseBoxCut(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-[family:var(--font-playfair)] font-normal text-neutral-900">
              {t.oppdelingsplan.chooseBoxTitle}
            </DialogTitle>
            <DialogDescription className="text-neutral-600 font-light">
              {t.oppdelingsplan.chooseBoxDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {(pendingChooseBoxCut?.boxOptions || []).map((option) => (
              <button
                key={`choose-box-${option.preset_slug}`}
                type="button"
                onClick={() => {
                  setDraftPresetSlug(option.preset_slug);
                  setChooseBoxOpen(false);
                  setPendingChooseBoxCut(null);
                  toast({
                    title: t.oppdelingsplan.addedToDraftTitle,
                    description: t.oppdelingsplan.addedToDraftBox.replace('{box}', option.preset_name),
                  });
                }}
                className="w-full text-left rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{option.preset_name}</p>
                    {option.target_weight_kg ? (
                      <p className="text-xs font-light text-neutral-600 truncate">
                        {t.oppdelingsplan.boxWeightHint.replace('{kg}', String(option.target_weight_kg))}
                      </p>
                    ) : null}
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {orders.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl">
          <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-5 py-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                  {t.oppdelingsplan.addingToOrderLabel}
                </p>
                <p className="text-sm font-light text-neutral-700 truncate">
                  {activeOrderLine}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {orders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOrderPickerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
                  >
                    {t.oppdelingsplan.changeOrder}
                  </button>
                )}
                <Link
                  href="/min-side"
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-neutral-800 transition-colors"
                >
                  {t.oppdelingsplan.viewOrder}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {orders.length === 0 && (draftPresetSlug || draftExtras.length > 0) && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl">
          <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-5 py-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                  {t.oppdelingsplan.draftSelectionLabel}
                </p>
                <p className="text-sm font-light text-neutral-700">
                  {draftPresetSlug
                    ? t.oppdelingsplan.draftSelectedBox.replace('{box}', draftPresetDisplayName || draftPresetSlug)
                    : t.oppdelingsplan.draftNoBoxSelected}
                  {draftExtras.length > 0
                    ? ` \u2022 ${t.oppdelingsplan.draftExtrasCount.replace('{count}', String(draftExtras.length))}`
                    : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftPresetSlug(null);
                    setDraftExtras([]);
                    setDraftSelectedCutKeys([]);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
                >
                  {t.oppdelingsplan.clearDraft}
                </button>

                <Link
                  href={buildCheckoutHref() || '/bestill'}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-neutral-800 transition-colors"
                >
                  {t.oppdelingsplan.goToCheckout}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
