import type { Breed } from './types'

export type BreedLocalization = Partial<
  Pick<
    Breed,
    | 'description'
    | 'detailedDescription'
    | 'eggColor'
    | 'sizeRange'
    | 'temperament'
    | 'annualProduction'
    | 'temperature'
    | 'humidity'
  >
>

export type BreedLocalizationMap = Record<string, BreedLocalization>

export function localizeBreed(
  breed: Breed,
  localizations?: BreedLocalizationMap
): Breed {
  const override = localizations?.[breed.slug]
  if (!override) return breed
  return { ...breed, ...override }
}

export function localizeBreeds(
  breeds: Breed[],
  localizations?: BreedLocalizationMap
): Breed[] {
  if (!localizations) return breeds
  return breeds.map((breed) => localizeBreed(breed, localizations))
}
