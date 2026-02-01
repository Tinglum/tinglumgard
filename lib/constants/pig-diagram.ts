/**
 * SVG polygon coordinates for the pig butcher diagram
 * Each cut is mapped by its ID to define the clickable areas
 */

export interface PigCutPolygon {
  id: number;
  name: string;
  points: string;
  ariaLabel: string;
}

export const PIG_CUT_POLYGONS: PigCutPolygon[] = [
  {
    id: 3,
    name: 'Nakke',
    points: '33,26 46,26 39,44 34,44',
    ariaLabel: 'Nakke',
  },
  {
    id: 8,
    name: 'Svinebog',
    points: '39,44 47,35 51,58 42,58',
    ariaLabel: 'Bog',
  },
  {
    id: 5,
    name: 'Kotelettkam',
    points: '45,21 70,21 68,35 47,35',
    ariaLabel: 'Kam',
  },
  {
    id: 7,
    name: 'Ribbeside',
    points: '48,37 68,36 68,53 51,58',
    ariaLabel: 'Side/Bacon',
  },
  {
    id: 9,
    name: 'Skinke',
    points: '72,23 82,34 84,50 70,56',
    ariaLabel: 'Skinke',
  },
  {
    id: 10,
    name: 'Knoke - front',
    points: '42,58 51,58 50,70 42,74',
    ariaLabel: 'Knoke',
  },
  {
    id: 10,
    name: 'Knoke - back',
    points: '70,56 80,56 82,74 72,76',
    ariaLabel: 'Knoke',
  },
];
