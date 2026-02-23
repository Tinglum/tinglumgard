const RECIPE_IMAGE_OVERRIDES: Record<string, string> = {
  // The original amatriciana image is currently seafood based.
  amatriciana: "/recipes/carbonara-guanciale.jpg",
  // These slugs pointed to clearly unrelated food categories.
  "secreto-plancha": "/recipes/neck-steak.jpg",
  "presa-herbs": "/recipes/tomahawk-grill.jpg",
  "lardo-crostini": "/recipes/coppa-project.jpg",
  "rendered-lard": "/recipes/coppa-project.jpg",
  "pancetta-project": "/recipes/neck-steak.jpg",
  "cure-ham": "/recipes/tomahawk-grill.jpg",
};

export function resolveRecipeImage(
  slug: string,
  imageUrl?: string | null
): string {
  return RECIPE_IMAGE_OVERRIDES[slug] || imageUrl || "/recipes/carbonara-guanciale.jpg";
}

