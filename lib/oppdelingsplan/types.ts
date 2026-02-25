export type PartKey =
  | 'nakke'
  | 'svinebog'
  | 'kotelettkam'
  | 'ribbeside'
  | 'skinke'
  | 'knoke'
  | 'unknown';

export interface CutBoxOption {
  preset_id: string;
  preset_slug: string;
  preset_name: string;
  target_weight_kg?: number | null;
  label: string;
}

export interface CutRecipeSuggestion {
  title_no?: string | null;
  title_en?: string | null;
  description_no?: string | null;
  description_en?: string | null;
  future_slug: string;
}

export interface CutOverview {
  key: string;
  cut_id: string | null;
  cut_slug: string | null;
  extra_slug?: string | null;
  name: string;
  description: string;
  sizeFromKg?: number | null;
  sizeToKg?: number | null;
  partKey: PartKey;
  partName: string;
  boxOptions: CutBoxOption[];
  recipeSuggestions?: CutRecipeSuggestion[];
}

export type PendingAddAction =
  | { kind: 'cut'; cut: CutOverview }
  | { kind: 'extra'; extraSlug: string; extraName: string };
