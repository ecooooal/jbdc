import { and, desc, eq, isNull } from 'drizzle-orm';
import type {
  Database,
  DatabaseHandle,
  DesignStatus,
  MaterialUseRole,
} from '@/features/database';
import { designMaterials, designs, MATERIAL_USE_ROLES } from '@/features/database';
import { readMaterialNamesFrom } from '@/features/materials';
import { readTaxonomyNamesFrom } from '@/features/taxonomy';
import { CREATIVE_DIRECTION_FIELDS } from './creative-direction-fields';
import { designFieldsChanged, type DesignEditableField } from './fields';
import { DESIGN_NAME_MAX_LENGTH, designNameProblem } from './limits';
import { normalizeOptionalText } from './optional-text';
import type { DesignSectionField } from './sections';
import { SPECIFICATION_FIELDS } from './specification-fields';

export { DESIGN_NAME_MAX_LENGTH, designNameProblem } from './limits';

/** A design as it is stored. Statuses and timestamps are never caller-supplied. */
export type Design = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  collectionId: string | null;
  silhouette: string | null;
  neckline: string | null;
  sleeveType: string | null;
  garmentDetails: string | null;
  sizeRange: string | null;
  measurements: string | null;
  constructionNotes: string | null;
  concept: string | null;
  mood: string | null;
  inspiration: string | null;
  intendedFeeling: string | null;
  audience: string | null;
  styling: string | null;
  palette: string | null;
  status: DesignStatus;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

/** The editable fields of a stored Design, from the one field list. Null means empty. */
export type DesignFields = Pick<Design, DesignEditableField>;

/** A new Design: a name is required, every other editable field is optional. */
export type CreateDesignInput = { name: string } & Partial<Omit<DesignFields, 'name'>>;

/**
 * A partial write: an absent field is left alone, while an explicit null
 * clears an optional one. A Specifications field clears just like description.
 * Status is never editable.
 */
export type UpdateDesignInput = Partial<DesignFields>;

/** A Material use with the Material's name resolved, as a table shows it. */
export type MaterialUse = {
  id: string;
  designId: string;
  materialId: string;
  materialName: string;
  colour: string;
  role: MaterialUseRole;
  createdAt: number;
};

/** One new use of a Material on a Design. */
export type AddMaterialUseInput = {
  materialId: string;
  colour: string;
  role: MaterialUseRole;
};

/** A partial correction of a recorded use: an absent field is left alone. */
export type UpdateMaterialUseInput = Partial<AddMaterialUseInput>;

/**
 * A Design's Material uses as a visit opened and as it will close. The two
 * arrive together, so a caller cannot hand History one side and silently
 * record every use as added or removed.
 */
export type MaterialUsesChange = {
  before: readonly MaterialUse[];
  after: readonly MaterialUse[];
};

/** A Design with the names Detail displays in place of its foreign keys. */
export type DesignDetail = Design & {
  category: string | null;
  collection: string | null;
  materialUses: MaterialUse[];
};

export class InvalidDesignNameError extends Error {
  constructor(readonly reason: 'empty' | 'too_long') {
    super(
      reason === 'empty'
        ? 'A design needs a name.'
        : `A design name can be at most ${DESIGN_NAME_MAX_LENGTH} characters.`
    );
    this.name = 'InvalidDesignNameError';
  }
}

export class InvalidMaterialUseError extends Error {
  constructor(readonly reason: 'empty_colour') {
    super('A material use needs a colour.');
    this.name = 'InvalidMaterialUseError';
  }
}

const designColumns = {
  id: designs.id,
  name: designs.name,
  description: designs.description,
  categoryId: designs.categoryId,
  collectionId: designs.collectionId,
  silhouette: designs.silhouette,
  neckline: designs.neckline,
  sleeveType: designs.sleeveType,
  garmentDetails: designs.garmentDetails,
  sizeRange: designs.sizeRange,
  measurements: designs.measurements,
  constructionNotes: designs.constructionNotes,
  concept: designs.concept,
  mood: designs.mood,
  inspiration: designs.inspiration,
  intendedFeeling: designs.intendedFeeling,
  audience: designs.audience,
  styling: designs.styling,
  palette: designs.palette,
  status: designs.status,
  createdAt: designs.createdAt,
  updatedAt: designs.updatedAt,
  deletedAt: designs.deletedAt,
};

/**
 * The values of one optional-text section a write would store, each trimmed;
 * whitespace alone is null. An absent field keeps the current value.
 */
function optionalTextValues<Field extends DesignSectionField>(
  fields: readonly { field: Field }[],
  current: Design | null,
  input: Partial<Record<Field, string | null | undefined>>
): Record<Field, string | null> {
  const values = {} as Record<Field, string | null>;

  for (const { field } of fields) {
    values[field] =
      input[field] === undefined
        ? (current?.[field] ?? null)
        : normalizeOptionalText(input[field]);
  }

  return values;
}

function normalizeName(raw: string): string {
  const name = raw.trim();
  const problem = designNameProblem(name);

  if (problem) throw new InvalidDesignNameError(problem);

  return name;
}

/**
 * Lowercased name, description, Specification, Creative direction, Category,
 * Collection, and every Material use's name and colour, rebuilt on every write.
 * The taxonomy and Material names are read from their tables, so a rename lands
 * in the search text the next time the design is written.
 */
function buildSearchText(
  design: DesignFields,
  category: string | null,
  collection: string | null,
  materialUseParts: readonly string[]
): string {
  return [
    design.name,
    design.description,
    ...SPECIFICATION_FIELDS.map(({ field }) => design[field]),
    ...CREATIVE_DIRECTION_FIELDS.map(({ field }) => design[field]),
    category,
    collection,
    ...materialUseParts,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** The names a Design's stored Category and Collection ids resolve to, or null. */
function designTaxonomyNames(
  database: Database,
  categoryId: string | null,
  collectionId: string | null
): { category: string | null; collection: string | null } {
  return designTaxonomyNamesFrom(database.db, categoryId, collectionId);
}

function designTaxonomyNamesFrom(
  db: DatabaseHandle,
  categoryId: string | null,
  collectionId: string | null
): { category: string | null; collection: string | null } {
  const names = readTaxonomyNamesFrom(db);

  return {
    category: categoryId ? (names.categories.get(categoryId) ?? null) : null,
    collection: collectionId ? (names.collections.get(collectionId)?.name ?? null) : null,
  };
}

const MATERIAL_USE_ROLE_ORDER = Object.fromEntries(
  MATERIAL_USE_ROLES.map((role, index) => [role, index])
) as Record<MaterialUseRole, number>;

function compareMaterialUses(left: MaterialUse, right: MaterialUse): number {
  return (
    MATERIAL_USE_ROLE_ORDER[left.role] - MATERIAL_USE_ROLE_ORDER[right.role] ||
    left.materialName.localeCompare(right.materialName) ||
    left.createdAt - right.createdAt ||
    left.id.localeCompare(right.id)
  );
}

/**
 * One Design's Material uses, ordered by role (main, secondary, other), then
 * Material name. The names come from the Material name read, deleted entries
 * included, so a use written before the Material was removed keeps its name.
 */
function materialUsesFrom(db: DatabaseHandle, designId: string): MaterialUse[] {
  const rows = db
    .select({
      id: designMaterials.id,
      designId: designMaterials.designId,
      materialId: designMaterials.materialId,
      colour: designMaterials.colour,
      role: designMaterials.role,
      createdAt: designMaterials.createdAt,
    })
    .from(designMaterials)
    .where(eq(designMaterials.designId, designId))
    .all();
  const names = readMaterialNamesFrom(db);

  return rows
    .map((row) => ({
      ...row,
      materialName: names.get(row.materialId) ?? row.materialId,
    }))
    .sort(compareMaterialUses);
}

/** One use of this Design, or null when it is unknown or belongs to another. */
function materialUseFrom(
  db: DatabaseHandle,
  designId: string,
  useId: string
): MaterialUse | null {
  return materialUsesFrom(db, designId).find((use) => use.id === useId) ?? null;
}

/** Each linked Material's name and colour, ready for `buildSearchText`. */
function materialUseSearchParts(db: DatabaseHandle, designId: string): string[] {
  return materialUsesFrom(db, designId).flatMap((use) => [use.materialName, use.colour]);
}

/**
 * Rebuilds a Design's `search_text` from the uses it now holds and moves
 * `updatedAt`, inside the caller's transaction. Every Material-use write lands
 * with it, so search and Library order never disagree with the stored uses.
 */
function rebuildDesignSearchTextAndMoveUpdated(
  tx: DatabaseHandle,
  design: Design,
  now: number
): void {
  const taxonomy = designTaxonomyNamesFrom(tx, design.categoryId, design.collectionId);

  tx.update(designs)
    .set({
      updatedAt: now,
      searchText: buildSearchText(
        design,
        taxonomy.category,
        taxonomy.collection,
        materialUseSearchParts(tx, design.id)
      ),
    })
    .where(eq(designs.id, design.id))
    .run();
}

/**
 * Writes one Design and returns it. A name is the only required input; a blank,
 * whitespace-only, or over-long name throws before anything is written. The
 * Category and Collection are optional and arrive as the ids the pickers chose;
 * the Specification and Creative direction fields are optional text.
 */
export function createDesign(
  database: Database,
  input: CreateDesignInput,
  now: number = Date.now()
): Design {
  const name = normalizeName(input.name);
  const description = normalizeOptionalText(input.description);
  const categoryId = input.categoryId ?? null;
  const collectionId = input.collectionId ?? null;
  const taxonomy = designTaxonomyNames(database, categoryId, collectionId);
  const design: Design = {
    id: database.newId(),
    name,
    description,
    categoryId,
    collectionId,
    ...optionalTextValues(SPECIFICATION_FIELDS, null, input),
    ...optionalTextValues(CREATIVE_DIRECTION_FIELDS, null, input),
    status: 'concept',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  database.db
    .insert(designs)
    .values({
      ...design,
      searchText: buildSearchText(design, taxonomy.category, taxonomy.collection, []),
    })
    .run();

  return design;
}

/**
 * Writes the fields the owner changed and returns the stored Design. An
 * absent field is untouched; null clears an optional one. A blank or
 * over-long name throws before anything is written, so the previous name
 * survives a refused save. A patch that changes nothing skips the write, so
 * the Updated timestamp only moves when the row does.
 */
export function updateDesign(
  database: Database,
  id: string,
  input: UpdateDesignInput,
  now: number = Date.now()
): Design | null {
  const current = getDesign(database, id);
  if (!current) return null;

  const specification = optionalTextValues(SPECIFICATION_FIELDS, current, input);
  const creativeDirection = optionalTextValues(CREATIVE_DIRECTION_FIELDS, current, input);
  const next: Design = {
    ...current,
    name: input.name === undefined ? current.name : normalizeName(input.name),
    description:
      input.description === undefined
        ? current.description
        : normalizeOptionalText(input.description),
    categoryId: input.categoryId === undefined ? current.categoryId : input.categoryId,
    collectionId: input.collectionId === undefined ? current.collectionId : input.collectionId,
    ...specification,
    ...creativeDirection,
  };

  if (!designFieldsChanged(next, current)) return current;

  const taxonomy = designTaxonomyNames(database, next.categoryId, next.collectionId);
  const materialUseParts = materialUseSearchParts(database.db, id);

  next.updatedAt = now;
  database.db
    .update(designs)
    .set({
      name: next.name,
      description: next.description,
      categoryId: next.categoryId,
      collectionId: next.collectionId,
      ...specification,
      ...creativeDirection,
      updatedAt: next.updatedAt,
      searchText: buildSearchText(next, taxonomy.category, taxonomy.collection, materialUseParts),
    })
    .where(eq(designs.id, id))
    .run();

  return next;
}

/** Reads one live Design; a soft-deleted row is gone as far as readers are concerned. */
export function getDesign(database: Database, id: string): Design | null {
  return designFrom(database.db, id);
}

function designFrom(db: DatabaseHandle, id: string): Design | null {
  return (
    db
      .select(designColumns)
      .from(designs)
      .where(and(eq(designs.id, id), isNull(designs.deletedAt)))
      .get() ?? null
  );
}

/**
 * The Detail read: one live Design, without taxonomy names. Detail shows a
 * Design in any status, so unlike the Library it never filters by status.
 * Private to the feature, like the Library's query builder.
 */
export function designDetailQuery(database: Database, id: string) {
  return database.db
    .select(designColumns)
    .from(designs)
    .where(and(eq(designs.id, id), isNull(designs.deletedAt)));
}

/**
 * Reads one live Design for Detail, resolving its Category and Collection
 * through the taxonomy name read and its Material uses through the Material
 * name read; null when it is unknown or soft-deleted.
 */
export function getDesignDetail(database: Database, id: string): DesignDetail | null {
  const design = designDetailQuery(database, id).get();

  if (!design) return null;

  return {
    ...design,
    ...designTaxonomyNames(database, design.categoryId, design.collectionId),
    materialUses: materialUsesFrom(database.db, id),
  };
}

/** All live Designs, most recently updated first. */
export function listDesigns(database: Database): Design[] {
  return database.db
    .select(designColumns)
    .from(designs)
    .where(isNull(designs.deletedAt))
    .orderBy(desc(designs.updatedAt))
    .all();
}

/** One Design's Material uses, ordered by role then Material name. */
export function listMaterialUses(database: Database, designId: string): MaterialUse[] {
  return materialUsesFrom(database.db, designId);
}

/**
 * Records one Material use on a Design. The insertion and the Design's rebuilt
 * `search_text` (every linked Material's name and colour) land in one
 * transaction, with `updatedAt` moved so the Library re-sorts by recency.
 * Returns null when the Design is unknown or soft-deleted.
 */
export function addMaterialUse(
  database: Database,
  designId: string,
  input: AddMaterialUseInput,
  now: number = Date.now()
): MaterialUse | null {
  const colour = input.colour.trim();

  if (colour.length === 0) throw new InvalidMaterialUseError('empty_colour');

  return database.transaction((tx) => {
    const design = designFrom(tx, designId);

    if (!design) return null;

    const use = {
      id: database.newId(),
      designId,
      materialId: input.materialId,
      colour,
      role: input.role,
      createdAt: now,
    };

    tx.insert(designMaterials).values(use).run();

    rebuildDesignSearchTextAndMoveUpdated(tx, design, now);

    return materialUseFrom(tx, designId, use.id);
  });
}

/**
 * Corrects one recorded Material use. Only the fields present in `input` are
 * written; the same transaction rebuilds the Design's `search_text` from every
 * use it now holds and moves `updatedAt`. A correction that changes nothing
 * writes nothing. Returns null when the Design or the use is unknown, and
 * refuses a blank colour before writing anything.
 */
export function updateMaterialUse(
  database: Database,
  designId: string,
  useId: string,
  input: UpdateMaterialUseInput,
  now: number = Date.now()
): MaterialUse | null {
  const colour = input.colour?.trim();

  if (colour !== undefined && colour.length === 0) {
    throw new InvalidMaterialUseError('empty_colour');
  }

  return database.transaction((tx) => {
    const design = designFrom(tx, designId);

    if (!design) return null;

    const current = tx
      .select({
        materialId: designMaterials.materialId,
        colour: designMaterials.colour,
        role: designMaterials.role,
      })
      .from(designMaterials)
      .where(and(eq(designMaterials.id, useId), eq(designMaterials.designId, designId)))
      .get();

    if (!current) return null;

    const next = {
      materialId: input.materialId ?? current.materialId,
      colour: colour ?? current.colour,
      role: input.role ?? current.role,
    };

    if (
      next.materialId === current.materialId &&
      next.colour === current.colour &&
      next.role === current.role
    ) {
      return materialUseFrom(tx, designId, useId);
    }

    tx.update(designMaterials).set(next).where(eq(designMaterials.id, useId)).run();

    rebuildDesignSearchTextAndMoveUpdated(tx, design, now);

    return materialUseFrom(tx, designId, useId);
  });
}

/**
 * Removes one recorded Material use and returns it as it was. The deletion and
 * the Design's rebuilt `search_text` — no longer carrying the removed
 * Material's name or colour — land in one transaction with `updatedAt` moved.
 * Returns null when the Design or the use is unknown.
 */
export function removeMaterialUse(
  database: Database,
  designId: string,
  useId: string,
  now: number = Date.now()
): MaterialUse | null {
  return database.transaction((tx) => {
    const design = designFrom(tx, designId);

    if (!design) return null;

    const removed = materialUseFrom(tx, designId, useId);

    if (!removed) return null;

    tx.delete(designMaterials)
      .where(and(eq(designMaterials.id, useId), eq(designMaterials.designId, designId)))
      .run();

    rebuildDesignSearchTextAndMoveUpdated(tx, design, now);

    return removed;
  });
}
