import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Database, DatabaseHandle } from '@/features/database';
import { materials } from '@/features/database';

/** A name is trimmed and must survive trimming; this is the only cap. */
export const MATERIAL_NAME_MAX_LENGTH = 120;

/** A Material as a picker needs it: enough to show and to select. */
export type Material = {
  id: string;
  name: string;
};

export type CreateMaterialInput = {
  name: string;
};

export class InvalidMaterialNameError extends Error {
  constructor(readonly reason: 'empty' | 'too_long' | 'duplicate') {
    super(
      reason === 'empty'
        ? 'A material needs a name.'
        : reason === 'too_long'
          ? `A material name can be at most ${MATERIAL_NAME_MAX_LENGTH} characters.`
          : 'That material is already in the list.'
    );
    this.name = 'InvalidMaterialNameError';
  }
}

function normalizeName(raw: string): string {
  const name = raw.trim();

  if (name.length === 0) throw new InvalidMaterialNameError('empty');
  if (name.length > MATERIAL_NAME_MAX_LENGTH) throw new InvalidMaterialNameError('too_long');

  return name;
}

/**
 * The owner's Materials, alphabetical, without any she has removed. The live
 * hook uses this same builder, so a picker and a direct read never disagree.
 */
export function materialsQuery(database: Database) {
  return database.db
    .select({ id: materials.id, name: materials.name })
    .from(materials)
    .where(isNull(materials.deletedAt))
    .orderBy(asc(materials.name));
}

/** Runs the Material list once. A screen uses the live hook instead. */
export function listMaterials(database: Database): Material[] {
  return materialsQuery(database).all();
}

/**
 * Every Material name, **including soft-deleted rows**, so a use written
 * before a Material was removed keeps its name. The live picker uses
 * `materialsQuery`, which hides those rows.
 */
export function readMaterialNamesFrom(db: DatabaseHandle): ReadonlyMap<string, string> {
  const rows = db.select({ id: materials.id, name: materials.name }).from(materials).all();

  return new Map(rows.map((row) => [row.id, row.name]));
}

/** Reads every Material name once, deleted entries included. */
export function readMaterialNames(database: Database): ReadonlyMap<string, string> {
  return readMaterialNamesFrom(database.db);
}

/**
 * Writes one Material and returns it in the shape a picker selects. The name
 * is trimmed; an empty, over-long, or exact duplicate name (case-sensitive)
 * throws before anything is written.
 */
export function createMaterial(
  database: Database,
  input: CreateMaterialInput,
  now: number = Date.now()
): Material {
  const name = normalizeName(input.name);
  const duplicate = database.db
    .select({ id: materials.id })
    .from(materials)
    .where(and(eq(materials.name, name), isNull(materials.deletedAt)))
    .get();

  if (duplicate) throw new InvalidMaterialNameError('duplicate');

  const material: Material = { id: database.newId(), name };

  database.db
    .insert(materials)
    .values({ ...material, createdAt: now })
    .run();

  return material;
}
