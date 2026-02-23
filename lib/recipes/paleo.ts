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
  pattern: RegExp;
}

const PALEO_RULES: PaleoRule[] = [
  { key: "pasta", pattern: /\b(pasta|spaghetti|rigatoni|bucatini)\b/i },
  { key: "cheese", pattern: /\b(pecorino|parmesan|cheddar|ost|cheese)\b/i },
  { key: "wine", pattern: /\b(hvitvin|white wine|vin)\b/i },
  { key: "butter", pattern: /\b(sm(?:\u00f8|o)r|butter)\b/i },
  { key: "bread", pattern: /\b(br(?:\u00f8|o)d|baguette|crostini|bread)\b/i },
  { key: "sugar", pattern: /\b(sukker|sugar)\b/i },
  { key: "flour", pattern: /\b(hvetemel|mel|flour)\b/i },
  { key: "breadcrumbs", pattern: /\b(br(?:\u00f8|o)dsmuler|breadcrumbs)\b/i },
  { key: "milk", pattern: /\b(melk|milk|fl(?:\u00f8|o)te|cream)\b/i },
];

export interface PaleoIngredientsResult {
  ingredients: RecipeIngredient[];
  appliedKeys: PaleoReplacementKey[];
}

export function applyPaleoIngredients(
  ingredients: RecipeIngredient[],
  replacements: PaleoReplacementMap
): PaleoIngredientsResult {
  const appliedKeys = new Set<PaleoReplacementKey>();

  const nextIngredients = ingredients.map((ingredient) => {
    const replacementLabels: string[] = [];

    for (const rule of PALEO_RULES) {
      if (rule.pattern.test(ingredient.item)) {
        appliedKeys.add(rule.key);
        const label = replacements[rule.key];
        if (label) replacementLabels.push(label);
      }
    }

    if (replacementLabels.length === 0) return ingredient;

    return {
      ...ingredient,
      item: `${ingredient.item} (${replacementLabels.join(", ")})`,
    };
  });

  return {
    ingredients: nextIngredients,
    appliedKeys: Array.from(appliedKeys),
  };
}

