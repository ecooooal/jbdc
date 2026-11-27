import { and, desc, eq, getTableColumns, isNull } from "drizzle-orm";
import type {
  Database,
  DatabaseHandle,
  LiveReadDeclaration,
  MaterialUseRole,
} from "@/features/database";
import {
  categories,
  collections,
  declareLiveRead,
  designMaterials,
  designs,
  MATERIAL_USE_ROLES,
  materials,
} from "@/features/database";
import { readMaterialNamesFrom } from "@/features/materials";
import { readTaxonomyNamesFrom, taxonomyLabel } from "@/features/taxonomy";
import { CREATIVE_DIRECTION_FIELDS } from "./creative-direction-fields";
import { DESIGN_EDITABLE_FIELDS, type DesignEditableField } from "./fields";
import { DESIGN_NAME_MAX_LENGTH, designNameProblem } from "./limits";
import { normalizeOptionalText } from "./optional-text";
import type { DesignSectionField } from "./sections";
import { SPECIFICATION_FIELDS } from "./specification-fields";

export { DESIGN_NAME_MAX_LENGTH, designNameProblem } from "./limits";

/**
 * A design as it is stored. Derived from the table, so a new section field is
 * added in the schema and the field list, not here. `searchText` is derived on
 * every write and is not part of the record a feature works with.
 */
export type Design = Omit<typeof designs.$inferSelect, "searchText">;

/** The editable fields of a stored Design, from the one field list. Null means empty. */
export type DesignFields = Pick<Design, DesignEditableField>;

/** A new Design: a name is required, every other editable field is optional. */
export type CreateDesignInput = { name: string } & Partial<Omit<DesignFields, "name">>;

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

/** One Material use a write stores, as a change rather than a function call. */
export type MaterialUseChange =
  | { kind: "add"; input: AddMaterialUseInput }
  | { kind: "correct"; useId: string; patch: UpdateMaterialUseInput }
  | { kind: "remove"; useId: string };

/**
 * Everything one write is asked to store: the fields the owner changed and the
 * Material use changes that belong with them. A caller declares what changed;
 * it never picks among several write functions.
 */
export type DesignChanges = {
  fields?: UpdateDesignInput;
  uses?: readonly MaterialUseChange[];
};

/**
 * What one declared change produced: the row the write stored, or the use it
 * could not find. The list is aligned with the changes the caller declared —
 * one `fields` entry for the patch, then one per Material use in declared order.
 */
export type ChangeOutcome =
  | { kind: "fields"; design: Design }
  | { kind: "add"; materialUse: MaterialUse }
  | { kind: "correct"; materialUse: MaterialUse }
  | { kind: "remove"; materialUse: MaterialUse }
  | { kind: "use-missing"; useId: string };

/**
 * The one answer a write gives: what it stored with one outcome per declared
 * change, the rule that refused the whole write, or nothing because the Design
 * row is no longer in the catalog. It never throws.
 */
export type DesignWriteResult =
  | {
      kind: "stored";
      /** The row as it now stands, whether or not anything changed. */
      design: Design;
      /** Every use the row holds after the write, with names resolved and ordered. */
      materialUses: MaterialUse[];
      /** One outcome per declared change, in declared order. */
      outcomes: ChangeOutcome[];
    }
  | { kind: "refused"; field: "name" | "colour"; message: string }
  | { kind: "design-missing" };

/**
 * A Design's Material uses as a visit opened and as it will close. The two
 * arrive together, so a caller cannot hand History one side and silently
 * record every use as added or removed.
 */
export type MaterialUsesPair = {
  before: readonly MaterialUse[];
  after: readonly MaterialUse[];
};

/** A Design with the names Detail displays in place of its foreign keys. */
export type DesignDetail = Design & {
  category: string | null;
  collection: string | null;
  materialUses: MaterialUse[];
};

/** The one sentence a refused name carries, shared by create and by the write. */
function nameProblemMessage(problem: "empty" | "too_long"): string {
  return problem === "empty"
    ? "A design needs a name."
    : `A design name can be at most ${DESIGN_NAME_MAX_LENGTH} characters.`;
}

export class InvalidDesignNameError extends Error {
  constructor(readonly reason: "empty" | "too_long") {
    super(nameProblemMessage(reason));
    this.name = "InvalidDesignNameError";
  }
}

/** The one sentence a refused colour carries. */
const EMPTY_COLOUR_MESSAGE = "A material use needs a colour.";

/**
 * The columns a read selects, derived from the table. `searchText` is derived
 * on write and is the only column a caller never gets back; a new field added
 * to the schema is selected here without another edit.
 */
const { searchText: _derivedSearchText, ...designColumns } = getTableColumns(designs);

/**
 * The values of one optional-text section a write would store, each trimmed;
 * whitespace alone is null. An absent field keeps the current value.
 */
function optionalTextValues<Field extends DesignSectionField>(
  fields: readonly { field: Field }[],
  current: Design | null,
  input: Partial<Record<Field, string | null | undefined>>,
): Record<Field, string | null> {
  const values = {} as Record<Field, string | null>;

  for (const { field } of fields) {
    values[field] =
      input[field] === undefined ? (current?.[field] ?? null) : normalizeOptionalText(input[field]);
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
  materialUseParts: readonly string[],
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
    .join(" ")
    .toLowerCase();
}

/** The names a Design's stored Category and Collection ids resolve to, or null. */
function designTaxonomyNames(
  database: Database,
  categoryId: string | null,
  collectionId: string | null,
): { category: string | null; collection: string | null } {
  return designTaxonomyNamesFrom(database.db, categoryId, collectionId);
}

function designTaxonomyNamesFrom(
  db: DatabaseHandle,
  categoryId: string | null,
  collectionId: string | null,
): { category: string | null; collection: string | null } {
  const names = readTaxonomyNamesFrom(db);

  return {
    category: categoryId ? (names.categories.get(categoryId) ?? null) : null,
    collection: collectionId ? (names.collections.get(collectionId)?.name ?? null) : null,
  };
}

const MATERIAL_USE_ROLE_ORDER = Object.fromEntries(
  MATERIAL_USE_ROLES.map((role, index) => [role, index]),
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
 * Material name. The names come from one Material name read — deleted entries
 * included, so a use written before a Material was removed keeps its name.
 * A write passes the read it already made, so a write reads names once.
 */
function materialUsesFrom(
  db: DatabaseHandle,
  designId: string,
  names: ReadonlyMap<string, string> = readMaterialNamesFrom(db),
): MaterialUse[] {
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

  return rows
    .map((row) => ({
      ...row,
      materialName: names.get(row.materialId) ?? row.materialId,
    }))
    .sort(compareMaterialUses);
}

/** Each linked Material's name and colour, ready for `buildSearchText`. */
function materialUseSearchParts(uses: readonly MaterialUse[]): string[] {
  return uses.flatMap((use) => [use.materialName, use.colour]);
}

/**
 * The row an optional-text patch would store. An absent field keeps its current
 * value; an explicit null clears one. Shared by create and by the one write path.
 */
function designAfterPatch(current: Design, input: UpdateDesignInput): Design {
  return {
    ...current,
    name: input.name === undefined ? current.name : normalizeName(input.name),
    description:
      input.description === undefined
        ? current.description
        : normalizeOptionalText(input.description),
    categoryId: input.categoryId === undefined ? current.categoryId : input.categoryId,
    collectionId: input.collectionId === undefined ? current.collectionId : input.collectionId,
    ...optionalTextValues(SPECIFICATION_FIELDS, current, input),
    ...optionalTextValues(CREATIVE_DIRECTION_FIELDS, current, input),
  };
}

/** The editable column values a write stores for a Design. */
function editableValues(design: Design): Partial<Design> {
  return Object.fromEntries(
    DESIGN_EDITABLE_FIELDS.map((field) => [field, design[field]]),
  ) as Partial<Design>;
}

/** A use's colour, trimmed; null means blank, which the write refuses. */
function storedColour(raw: string): string | null {
  const colour = raw.trim();

  return colour.length === 0 ? null : colour;
}

/**
 * Whether a write would store exactly what the row and its uses already hold.
 * History's Diff decides what an Event records; this predicate only decides
 * whether the write needs a statement, so its Material comparison must stay
 * aligned with that Diff: keyed by id, compared on Material, colour, and role,
 * while order, resolved names, and timestamps are ignored.
 */
function isUnchanged(
  current: Design,
  next: Design,
  beforeUses: readonly MaterialUse[],
  afterUses: readonly MaterialUse[],
): boolean {
  if (DESIGN_EDITABLE_FIELDS.some((field) => current[field] !== next[field])) return false;
  if (beforeUses.length !== afterUses.length) return false;

  const beforeById = new Map(beforeUses.map((use) => [use.id, use]));

  return afterUses.every((use) => {
    const previous = beforeById.get(use.id);

    return (
      previous !== undefined &&
      previous.materialId === use.materialId &&
      previous.colour === use.colour &&
      previous.role === use.role
    );
  });
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
  now: number = Date.now(),
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
    status: "concept",
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
 * The one write path for a Design and its Material uses. A caller declares the
 * field and use changes; this function reads the row and its uses once, decides
 * once whether anything changed, and stores the row, its uses, the rebuilt
 * `search_text`, and the moved `updatedAt` in one transaction. An observer sees
 * the row and its search text together or not at all. It answers once: what it
 * stored with one outcome per declared change, the rule that refused it, or
 * `design-missing` when the Design row is no longer in the catalog.
 */
export function writeDesign(
  database: Database,
  designId: string,
  changes: DesignChanges,
  now: number = Date.now(),
): DesignWriteResult {
  return database.transaction((tx) => {
    // Read the row first: a refusal is about a row that exists, so a missing
    // Design answers `design-missing` whatever the changes hold.
    const current = designFrom(tx, designId);
    if (!current) return { kind: "design-missing" };

    // Validate inside the transaction: a refusal stores nothing, and no row
    // write can land without the search text that belongs with it. A name is
    // judged first, then each use's colour, so a refusal names the one field
    // that stopped the write.
    const fields: UpdateDesignInput = { ...changes.fields };

    if (fields.name !== undefined) {
      const problem = designNameProblem(fields.name);

      if (problem) {
        return { kind: "refused", field: "name", message: nameProblemMessage(problem) };
      }

      fields.name = fields.name.trim();
    }

    for (const change of changes.uses ?? []) {
      const colour =
        change.kind === "add"
          ? change.input.colour
          : change.kind === "correct"
            ? change.patch.colour
            : undefined;

      if (colour !== undefined && storedColour(colour) === null) {
        return { kind: "refused", field: "colour", message: EMPTY_COLOUR_MESSAGE };
      }
    }

    const uses = (changes.uses ?? []).map((change) => {
      if (change.kind === "add") {
        return {
          ...change,
          input: { ...change.input, colour: storedColour(change.input.colour)! },
        };
      }
      if (change.kind === "correct" && change.patch.colour !== undefined) {
        return {
          ...change,
          patch: { ...change.patch, colour: storedColour(change.patch.colour)! },
        };
      }
      return change;
    });

    // One name read and one use read per write. Both the search rebuild and the
    // returned uses work from these, so a write never walks either table twice.
    const names = readMaterialNamesFrom(tx);
    const beforeUses = materialUsesFrom(tx, designId, names);
    const next = designAfterPatch(current, fields);

    const working = beforeUses.slice();
    const useOutcomes: ChangeOutcome[] = [];

    for (const change of uses) {
      if (change.kind === "add") {
        const use: MaterialUse = {
          id: database.newId(),
          designId,
          materialId: change.input.materialId,
          materialName: names.get(change.input.materialId) ?? change.input.materialId,
          colour: change.input.colour,
          role: change.input.role,
          createdAt: now,
        };
        working.push(use);
        useOutcomes.push({ kind: "add", materialUse: use });
        continue;
      }

      const index = working.findIndex((use) => use.id === change.useId);

      if (index < 0) {
        useOutcomes.push({ kind: "use-missing", useId: change.useId });
        continue;
      }

      if (change.kind === "remove") {
        const [gone] = working.splice(index, 1);
        useOutcomes.push({ kind: "remove", materialUse: gone });
        continue;
      }

      const materialId = change.patch.materialId ?? working[index].materialId;
      const nextUse: MaterialUse = {
        ...working[index],
        materialId,
        materialName: names.get(materialId) ?? materialId,
        colour: change.patch.colour ?? working[index].colour,
        role: change.patch.role ?? working[index].role,
      };
      working[index] = nextUse;
      useOutcomes.push({ kind: "correct", materialUse: nextUse });
    }

    const materialUses = working.sort(compareMaterialUses);
    const unchanged = isUnchanged(current, next, beforeUses, materialUses);
    const stored: Design = unchanged ? current : { ...next, updatedAt: now };
    const outcomes: ChangeOutcome[] = [
      ...(changes.fields ? [{ kind: "fields" as const, design: stored }] : []),
      ...useOutcomes,
    ];

    if (unchanged) {
      return { kind: "stored", design: stored, materialUses, outcomes };
    }

    const taxonomy = designTaxonomyNamesFrom(tx, next.categoryId, next.collectionId);

    tx.update(designs)
      .set({
        ...editableValues(next),
        updatedAt: now,
        searchText: buildSearchText(
          next,
          taxonomy.category,
          taxonomy.collection,
          materialUseSearchParts(materialUses),
        ),
      })
      .where(eq(designs.id, designId))
      .run();

    for (const outcome of useOutcomes) {
      if (outcome.kind === "add") {
        const use = outcome.materialUse;

        tx.insert(designMaterials)
          .values({
            id: use.id,
            designId,
            materialId: use.materialId,
            colour: use.colour,
            role: use.role,
            createdAt: use.createdAt,
          })
          .run();
        continue;
      }

      if (outcome.kind === "correct") {
        const use = outcome.materialUse;

        tx.update(designMaterials)
          .set({ materialId: use.materialId, colour: use.colour, role: use.role })
          .where(eq(designMaterials.id, use.id))
          .run();
        continue;
      }

      if (outcome.kind === "remove") {
        tx.delete(designMaterials).where(eq(designMaterials.id, outcome.materialUse.id)).run();
      }
    }

    return { kind: "stored", design: stored, materialUses, outcomes };
  });
}

/** Reads one live Design; a soft-deleted row is gone as far as readers are concerned. */
export function getDesign(database: Database, id: string): Design | null {
  return designFrom(database.db, id);
}

export function designFrom(db: DatabaseHandle, id: string): Design | null {
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
 * Module-private: its one caller sits in this file.
 */
function designDetailQuery(database: Database, id: string) {
  return database.db
    .select(designColumns)
    .from(designs)
    .where(and(eq(designs.id, id), isNull(designs.deletedAt)));
}

/**
 * Reads one live Design for Detail, resolving its Category name and its
 * Collection label through the taxonomy name read, and its Material uses
 * through the Material name read; null when it is unknown or soft-deleted.
 */
export function getDesignDetail(database: Database, id: string): DesignDetail | null {
  const design = designDetailQuery(database, id).get();

  if (!design) return null;

  const names = readTaxonomyNamesFrom(database.db);
  const collection = design.collectionId ? names.collections.get(design.collectionId) : undefined;

  return {
    ...design,
    category: design.categoryId ? (names.categories.get(design.categoryId) ?? null) : null,
    collection: collection ? taxonomyLabel(collection) : null,
    materialUses: materialUsesFrom(database.db, id),
  };
}

/** The one row shape Detail's live read produces, before the hook adds status. */
export type DesignDetailRows = {
  design: DesignDetail | null;
};

/**
 * The Detail read: the Design and every name and use it resolves, with all
 * five tables it watches declared beside the query (ADR-0005). Adding a
 * resolved name is one local edit here.
 */
export function designDetailRead(id: string): LiveReadDeclaration<DesignDetailRows> {
  return declareLiveRead<DesignDetailRows>({
    tables: [designs, categories, collections, designMaterials, materials],
    read: (database) => ({ design: getDesignDetail(database, id) }),
    empty: { design: null },
  });
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
