import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  categories,
  collections,
  declareLiveRead,
  DESIGN_STATUSES,
  designEvents,
  designs,
  images,
  type Database,
  type DesignStatus,
} from "@/features/database";
import { coverOf, type Image } from "@/features/images";
import { readTaxonomyNames, taxonomyLabel } from "@/features/taxonomy";

/**
 * The two Statuses the default Library hides. Every other Status in the schema
 * is shown, so a Status added to `DESIGN_STATUSES` joins the Library without an
 * edit here.
 */
const HIDDEN_LIBRARY_STATUSES: readonly DesignStatus[] = ["rejected", "archived"];

/** The statuses the Library shows before any filter is chosen. */
export const DEFAULT_LIBRARY_STATUSES: readonly DesignStatus[] = DESIGN_STATUSES.filter(
  (status) => !HIDDEN_LIBRARY_STATUSES.includes(status),
);

export type LibraryDesign = {
  id: string;
  name: string;
  category: string | null;
  collection: string | null;
  status: DesignStatus;
  updatedAt: number;
  /** The image that represents the design in the grid; null when it has none. */
  cover: Image | null;
};

type LibraryDesignRow = {
  id: string;
  name: string;
  categoryId: string | null;
  collectionId: string | null;
  status: DesignStatus;
  updatedAt: number;
};

/**
 * The Library's default query: active statuses, no soft-deleted rows, most
 * recently updated first. Taxonomy names are resolved separately, through the
 * one name read, so a rename or a delete is never stale beside the row.
 *
 * Module-private: only this module's own reads (`listLibraryDesigns` and
 * `libraryDesignsRead`) name it; the package entry exposes those reads.
 */
function libraryDesignsQuery(database: Database) {
  return database.db
    .select({
      id: designs.id,
      name: designs.name,
      categoryId: designs.categoryId,
      collectionId: designs.collectionId,
      status: designs.status,
      updatedAt: designs.updatedAt,
    })
    .from(designs)
    .where(and(inArray(designs.status, [...DEFAULT_LIBRARY_STATUSES]), isNull(designs.deletedAt)))
    .orderBy(desc(designs.updatedAt));
}

function withTaxonomyNames(database: Database, rows: LibraryDesignRow[]): LibraryDesign[] {
  const names = readTaxonomyNames(database);
  const covers = coversFor(
    database,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const collection = row.collectionId ? names.collections.get(row.collectionId) : undefined;

    return {
      id: row.id,
      name: row.name,
      category: row.categoryId ? (names.categories.get(row.categoryId) ?? null) : null,
      collection: collection ? taxonomyLabel(collection) : null,
      status: row.status,
      updatedAt: row.updatedAt,
      cover: covers.get(row.id) ?? null,
    };
  });
}

/**
 * Each design's Cover, read for the whole page in one query and derived by the
 * images module's one rule. A design with no images is simply absent, so the
 * card falls back to the placeholder.
 */
function coversFor(database: Database, designIds: readonly string[]): Map<string, Image> {
  const covers = new Map<string, Image>();

  if (designIds.length === 0) return covers;

  const rows = database.db
    .select()
    .from(images)
    .where(inArray(images.designId, [...designIds]))
    .all();
  const byDesign = new Map<string, Image[]>();

  for (const row of rows) {
    const stored = byDesign.get(row.designId);

    if (stored) stored.push(row);
    else byDesign.set(row.designId, [row]);
  }

  for (const [designId, stored] of byDesign) {
    const cover = coverOf(stored);

    if (cover) covers.set(designId, cover);
  }

  return covers;
}

/** Runs the default query once. The screen uses the live hook instead. */
export function listLibraryDesigns(database: Database): LibraryDesign[] {
  return withTaxonomyNames(database, libraryDesignsQuery(database).all());
}

/** The one row shape the Library's live read produces, before status. */
export type LibraryRows = {
  designs: LibraryDesign[];
};

/**
 * The Library read: the default query's rows and the tables it watches. The
 * names come from the taxonomy name read, but a rename or a delete still has
 * to re-run this read, so those tables are declared here; the Cover is derived
 * from the images table, so it is declared too (ADR-0005).
 */
export const libraryDesignsRead = declareLiveRead<LibraryRows>({
  tables: [designs, categories, collections, images],
  read: (database) => ({ designs: listLibraryDesigns(database) }),
  empty: { designs: [] },
});

/**
 * One rejected Design with the why of its latest Decision: the reason it was
 * rejected, and when that reason was recorded. A Design rejected before the
 * Decision reader existed, or whose latest Decision recorded no reason, has
 * nulls rather than an invented one.
 */
export type RejectedDesign = LibraryDesign & {
  status: Extract<DesignStatus, "rejected">;
  reason: string | null;
  /** When the latest Decision was recorded; null when the Design has none. */
  decidedAt: number | null;
};

/** The latest Decision of each Design, as the rejected view reads it. */
type LatestDecision = {
  reason: string | null;
  decidedAt: number;
};

/** The rejected designs' query: the Rejected Status only, most recently updated first. */
function rejectedDesignsQuery(database: Database) {
  return database.db
    .select({
      id: designs.id,
      name: designs.name,
      categoryId: designs.categoryId,
      collectionId: designs.collectionId,
      status: designs.status,
      updatedAt: designs.updatedAt,
    })
    .from(designs)
    .where(and(eq(designs.status, "rejected"), isNull(designs.deletedAt)))
    .orderBy(desc(designs.updatedAt));
}

/**
 * Each Design's latest Decision, newest first. Equal timestamps fall back to
 * insertion order, the same order History reads Events in, so a later Decision
 * written in the same millisecond still wins.
 */
function latestDecisionsFor(
  database: Database,
  designIds: readonly string[],
): Map<string, LatestDecision> {
  const latest = new Map<string, LatestDecision>();

  if (designIds.length === 0) return latest;

  const rows = database.db
    .select({
      designId: designEvents.designId,
      reason: designEvents.reason,
      createdAt: designEvents.createdAt,
    })
    .from(designEvents)
    .where(and(inArray(designEvents.designId, [...designIds]), eq(designEvents.kind, "decision")))
    .orderBy(desc(designEvents.createdAt), desc(sql`design_events.rowid`))
    .all();

  for (const row of rows) {
    if (!latest.has(row.designId)) {
      latest.set(row.designId, { reason: row.reason ?? null, decidedAt: row.createdAt });
    }
  }

  return latest;
}

/**
 * Runs the rejected query once. A row keeps the Library's shape — name, Cover,
 * taxonomy, Status, update — and adds the latest Decision's reason and time.
 */
export function listRejectedDesigns(database: Database): RejectedDesign[] {
  const rows = withTaxonomyNames(database, rejectedDesignsQuery(database).all());
  const latest = latestDecisionsFor(
    database,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const decision = latest.get(row.id);

    return {
      ...row,
      status: "rejected",
      reason: decision?.reason ?? null,
      decidedAt: decision?.decidedAt ?? null,
    };
  });
}

/** The one row shape the rejected live read produces, before status. */
export type RejectedDesignRows = {
  designs: RejectedDesign[];
};

/**
 * The rejected view's read: the rejected query's rows and every table it reads.
 * A new or edited Design, a recorded Decision, a Cover change, and a taxonomy
 * rename or delete all re-run it (ADR-0005).
 */
export const rejectedDesignsRead = declareLiveRead<RejectedDesignRows>({
  tables: [designs, designEvents, images, categories, collections],
  read: (database) => ({ designs: listRejectedDesigns(database) }),
  empty: { designs: [] },
});
