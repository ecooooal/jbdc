import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Database, DatabaseHandle, DesignStatus } from '@/features/database';
import { designs } from '@/features/database';

/** A name is trimmed and must survive trimming; this is the only cap. */
export const DESIGN_NAME_MAX_LENGTH = 120;

export type CreateDesignInput = {
  name: string;
  description?: string | null;
};

/** A design as it is stored. Statuses and timestamps are never caller-supplied. */
export type Design = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  collectionId: string | null;
  status: DesignStatus;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
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

const designColumns = {
  id: designs.id,
  name: designs.name,
  description: designs.description,
  categoryId: designs.categoryId,
  collectionId: designs.collectionId,
  status: designs.status,
  createdAt: designs.createdAt,
  updatedAt: designs.updatedAt,
  deletedAt: designs.deletedAt,
};

function normalizeName(raw: string): string {
  const name = raw.trim();

  if (name.length === 0) throw new InvalidDesignNameError('empty');
  if (name.length > DESIGN_NAME_MAX_LENGTH) throw new InvalidDesignNameError('too_long');

  return name;
}

function normalizeDescription(raw: string | null | undefined): string | null {
  const description = raw?.trim();

  return description ? description : null;
}

/**
 * Lowercased name and description, rebuilt on every write. Category and
 * collection names join this once designs can be created with them.
 */
function buildSearchText(name: string, description: string | null): string {
  return [name, description].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Writes one Design and returns it. A name is the only required input; a blank,
 * whitespace-only, or over-long name throws before anything is written.
 */
export function createDesign(
  database: Database,
  input: CreateDesignInput,
  now: number = Date.now()
): Design {
  const name = normalizeName(input.name);
  const description = normalizeDescription(input.description);
  const design: Design = {
    id: database.newId(),
    name,
    description,
    categoryId: null,
    collectionId: null,
    status: 'concept',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  database.db
    .insert(designs)
    .values({
      ...design,
      searchText: buildSearchText(name, description),
    })
    .run();

  return design;
}

/** Reads one live Design; a soft-deleted row is gone as far as readers are concerned. */
export function getDesign(db: DatabaseHandle, id: string): Design | null {
  return (
    db
      .select(designColumns)
      .from(designs)
      .where(and(eq(designs.id, id), isNull(designs.deletedAt)))
      .get() ?? null
  );
}

/** All live Designs, most recently updated first. */
export function listDesigns(db: DatabaseHandle): Design[] {
  return db
    .select(designColumns)
    .from(designs)
    .where(isNull(designs.deletedAt))
    .orderBy(desc(designs.updatedAt))
    .all();
}
