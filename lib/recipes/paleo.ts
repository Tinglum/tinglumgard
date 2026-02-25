import { fixMojibake } from '@/lib/utils/text';

export interface RecipeIngredient {
  amount: string;
  item: string;
}

export type PaleoReplacementKey =
  | "pasta"
  | "cheese"
  | "wine"
  | "butter"
  | "bread"
  | "sugar"
  | "flour"
  | "breadcrumbs"
  | "milk";

export type PaleoReplacementMap = Record<PaleoReplacementKey, string>;

interface PaleoRule {
  key: PaleoReplacementKey;
  match: (normalizedTokens: string[]) => boolean;
}

const PALEO_RULES: PaleoRule[] = [
  {
    key: "pasta",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'pasta' ||
        token === 'spaghetti' ||
        token === 'rigatoni' ||
        token === 'bucatini' ||
        token === 'macaroni' ||
        token === 'noodles' ||
        token === 'nudler'
      ),
  },
  {
    key: "cheese",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'cheese' ||
        token.includes('cheese') ||
        token === 'pecorino' ||
        token === 'parmesan' ||
        token === 'cheddar' ||
        token === 'mozzarella' ||
        token === 'gouda' ||
        token === 'ost' ||
        token.endsWith('ost')
      ),
  },
  {
    key: "wine",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'vin' ||
        token === 'hvitvin' ||
        token === 'rodvin' ||
        token === 'redvin' ||
        token === 'wine' ||
        token === 'whitewine' ||
        token === 'redwine'
      ),
  },
  {
    key: "butter",
    match: (tokens) =>
      tokens.some((token) =>
        (token === 'smor' || token.endsWith('smor')) ||
        token === 'butter' ||
        token.endsWith('butter')
      ) && !tokens.some((token) => token === 'ghee' || token === 'talg'),
  },
  {
    key: "bread",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'brod' ||
        token.endsWith('brod') ||
        token === 'bread' ||
        token.endsWith('bread') ||
        token === 'baguette' ||
        token === 'crostini' ||
        token === 'toast'
      ),
  },
  {
    key: "sugar",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'sukker' ||
        token.endsWith('sukker') ||
        token === 'sugar' ||
        token.endsWith('sugar') ||
        token.endsWith('sirup') ||
        token.endsWith('syrup')
      ),
  },
  {
    key: "flour",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'hvetemel' ||
        token === 'flour' ||
        token.endsWith('flour') ||
        token.endsWith('mel')
      ) && !tokens.some((token) => token === 'mandelmel'),
  },
  {
    key: "breadcrumbs",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'brodsmuler' ||
        token === 'breadcrumbs' ||
        token === 'breadcrumb' ||
        token === 'panko'
      ),
  },
  {
    key: "milk",
    match: (tokens) =>
      tokens.some((token) =>
        token === 'melk' ||
        token.endsWith('melk') ||
        token === 'milk' ||
        token.endsWith('milk') ||
        token === 'flote' ||
        token.endsWith('flote') ||
        token === 'cream' ||
        token.endsWith('cream') ||
        token === 'cremefraiche'
      ) && !tokens.some((token) => token === 'kokosmelk'),
  },
];

export interface PaleoIngredient extends RecipeIngredient {
  replacementLabels: string[];
}

export interface PaleoIngredientsResult {
  ingredients: PaleoIngredient[];
  appliedKeys: PaleoReplacementKey[];
}

function normalizeIngredientTokens(value: string): string[] {
  return fixMojibake(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function applyPaleoIngredients(
  ingredients: RecipeIngredient[],
  replacements: PaleoReplacementMap
): PaleoIngredientsResult {
  const appliedKeys = new Set<PaleoReplacementKey>();

  const nextIngredients = ingredients.map((ingredient) => {
    const cleanItem = fixMojibake(String(ingredient.item || ''));
    const normalizedTokens = normalizeIngredientTokens(cleanItem);
    const replacementLabels: string[] = [];

    for (const rule of PALEO_RULES) {
      if (rule.match(normalizedTokens)) {
        appliedKeys.add(rule.key);
        const label = replacements[rule.key];
        if (label && !replacementLabels.includes(label)) {
          replacementLabels.push(label);
        }
      }
    }

    return {
      ...ingredient,
      item: cleanItem,
      replacementLabels,
    };
  });

  return {
    ingredients: nextIngredients,
    appliedKeys: Array.from(appliedKeys),
  };
}
