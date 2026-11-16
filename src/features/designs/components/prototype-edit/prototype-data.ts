/**
 * PROTOTYPE DATA — throwaway. Settles one question: two tabs, three tabs, or
 * one scroll for the Specification / Creative direction slice (#7).
 *
 * The 14 fields below are the agreed schema, so the density is real. The values
 * are invented, because the columns do not exist in the database yet and a
 * prototype writes nothing.
 */

export const PROTOTYPE_FIELD_KEYS = [
  'silhouette',
  'neckline',
  'sleeveType',
  'garmentDetails',
  'sizeRange',
  'measurements',
  'constructionNotes',
  'concept',
  'mood',
  'inspiration',
  'intendedFeeling',
  'audience',
  'styling',
  'palette',
] as const;

export type PrototypeFieldKey = (typeof PROTOTYPE_FIELD_KEYS)[number];

export type PrototypeField = {
  key: PrototypeFieldKey;
  label: string;
  hint: string;
  multiline: boolean;
};

export const PROTOTYPE_SPECIFICATION: readonly PrototypeField[] = [
  {
    key: 'silhouette',
    label: 'Silhouette',
    hint: 'e.g. relaxed A-line, midi length, dropped shoulder',
    multiline: false,
  },
  {
    key: 'neckline',
    label: 'Neckline',
    hint: 'e.g. wide boat neck with a bias facing',
    multiline: false,
  },
  {
    key: 'sleeveType',
    label: 'Sleeve type',
    hint: 'e.g. dropped shoulder, wide three-quarter sleeve',
    multiline: false,
  },
  {
    key: 'garmentDetails',
    label: 'Garment details',
    hint: 'e.g. pockets, buttons, zippers, pleats',
    multiline: true,
  },
  {
    key: 'sizeRange',
    label: 'Size range',
    hint: 'e.g. UK 8–16',
    multiline: false,
  },
  {
    key: 'measurements',
    label: 'Measurements',
    hint: 'e.g. bust 96 / waist 104 / hip 112 / length 118 (size 12)',
    multiline: true,
  },
  {
    key: 'constructionNotes',
    label: 'Construction notes',
    hint: 'Production or sewing notes',
    multiline: true,
  },
];

export const PROTOTYPE_DIRECTION: readonly PrototypeField[] = [
  {
    key: 'concept',
    label: 'Concept',
    hint: 'What this piece is trying to do',
    multiline: true,
  },
  { key: 'mood', label: 'Mood', hint: 'e.g. slow, sun-bleached, unhurried', multiline: false },
  {
    key: 'inspiration',
    label: 'Inspiration',
    hint: 'What set this off',
    multiline: true,
  },
  {
    key: 'intendedFeeling',
    label: 'Intended feeling',
    hint: 'How it should make the wearer feel',
    multiline: false,
  },
  {
    key: 'audience',
    label: 'Audience',
    hint: 'Who it is for',
    multiline: false,
  },
  {
    key: 'styling',
    label: 'Styling',
    hint: 'e.g. flat sandals, one silver cuff, hair down',
    multiline: true,
  },
  {
    key: 'palette',
    label: 'Palette',
    hint: 'e.g. chalk white, oyster, faded indigo',
    multiline: false,
  },
];

export const PROTOTYPE_VALUES: Record<PrototypeFieldKey, string> = {
  silhouette: 'Relaxed A-line, midi length, dropped shoulder',
  neckline: 'Wide boat neck with a bias facing',
  sleeveType: 'Dropped shoulder, wide three-quarter sleeve',
  garmentDetails: 'Concealed side zip, two inseam pockets, 4cm hem',
  sizeRange: 'UK 8–16',
  measurements: '',
  constructionNotes: 'French seams throughout; facing interfaced with silk organza',
  concept: 'A summer dress that behaves like a shirt: thrown on, cooled, packed.',
  mood: 'Slow, sun-bleached, unhurried',
  inspiration: 'Irish linen shirting, Japanese work aprons, the beach at Barrika',
  intendedFeeling: 'Comfortable but composed — never fussy',
  audience: '',
  styling: 'Flat sandals, one silver cuff, hair down or a low bun',
  palette: 'Chalk white, oyster, faded indigo',
};

export type PrototypeMaterial = { id: string; name: string };

/** The owner-managed Material list, as the picker would offer it. */
export const PROTOTYPE_MATERIALS: readonly PrototypeMaterial[] = [
  { id: 'material-silk-crepe', name: 'Silk crêpe' },
  { id: 'material-cotton-poplin', name: 'Cotton poplin' },
  { id: 'material-silk-organza', name: 'Silk organza' },
  { id: 'material-linen-canvas', name: 'Linen canvas' },
  { id: 'material-wool-twill', name: 'Wool twill' },
];

export const MATERIAL_ROLES = ['main', 'secondary', 'other'] as const;

export type MaterialRole = (typeof MATERIAL_ROLES)[number];

export const ROLE_LABELS: Record<MaterialRole, string> = {
  main: 'Main',
  secondary: 'Secondary',
  other: 'Other',
};

/** One design's use of a Material: the colour used and the role it plays. */
export type PrototypeMaterialUse = {
  id: string;
  materialId: string;
  colour: string;
  role: MaterialRole;
};

export const PROTOTYPE_MATERIAL_USES: readonly PrototypeMaterialUse[] = [
  { id: 'use-1', materialId: 'material-silk-crepe', colour: 'Ivory', role: 'main' },
  { id: 'use-2', materialId: 'material-cotton-poplin', colour: 'Chalk', role: 'secondary' },
  { id: 'use-3', materialId: 'material-silk-organza', colour: 'Oyster', role: 'other' },
];

export function materialName(materialId: string): string {
  return PROTOTYPE_MATERIALS.find((material) => material.id === materialId)?.name ?? 'Unknown';
}
