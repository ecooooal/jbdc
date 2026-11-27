import { desc, eq, sql } from "drizzle-orm";
import type {
  Database,
  DatabaseHandle,
  DesignEventKind,
  DesignStatus,
  ImageKind,
  LiveReadDeclaration,
} from "@/features/database";
import {
  categories,
  collections,
  declareLiveRead,
  designEvents,
  images,
} from "@/features/database";
import { readTaxonomyNames, type TaxonomyNames } from "@/features/taxonomy";
import {
  DESIGN_EDITABLE_FIELDS,
  type DesignEditableField,
  type DesignFields,
  type MaterialUse,
  type MaterialUsesPair,
} from "@/features/designs";
import type { HistoryLine } from "./lines";

/** What one field was before an edit and what it became. Null means empty. */
export type DesignFieldChange = {
  from: string | null;
  to: string | null;
};

/** One Status move, recorded under the diff's `status` key. */
export type StatusMove = {
  from: DesignStatus;
  to: DesignStatus;
};

/** One Material use a visit added, removed, or corrected, as History reads it back. */
export type RecordedMaterialUse = Omit<MaterialUse, "designId" | "createdAt">;

/** A corrected Material use: what it was before the visit and what it became. */
export type MaterialUseCorrection = {
  from: RecordedMaterialUse;
  to: RecordedMaterialUse;
};

/** What one visit did to a Design's Material uses. */
export type MaterialUsesDiff = {
  added?: RecordedMaterialUse[];
  removed?: RecordedMaterialUse[];
  changed?: MaterialUseCorrection[];
};

/** One image as History records it: its identity, its kind, and its stored file. */
export type RecordedImage = {
  id: string;
  kind: ImageKind;
  contentHash: string;
  extension: string;
};

/** One Image row as the images module stores it, before History projects it. */
type ImageRow = typeof images.$inferSelect;

/**
 * What one structural image action did, as the images module reports it: whole
 * Image rows. History decides which of their fields it keeps.
 */
export type ImageChangeRows = {
  attached?: ImageRow[];
  removed?: ImageRow[];
  reclassified?: { from: ImageRow; to: ImageRow }[];
};

/** A reclassified image: the kind it had and the kind it became. */
export type ImageReclassification = {
  from: RecordedImage;
  to: RecordedImage;
};

/**
 * What one structural image action did: the images it attached, the image it
 * removed, or the image it reclassified. One action writes one Event, so a
 * multi-attach carries several `attached` entries in one diff.
 */
export type ImageChangeDiff = {
  attached?: RecordedImage[];
  removed?: RecordedImage[];
  reclassified?: ImageReclassification[];
};

/** One line History prints for a Material use, keyed for rendering. */
export type MaterialUseLine = HistoryLine;

/**
 * What one visit changed: the fields whose values differ, each with
 * its old and new value, plus the Material uses it added, removed, or
 * corrected. The uses are a key of their own rather than a field, because they
 * live in their own table; an Event written before that key existed simply has
 * no `materials`. `images` rides in the same diff shape but is written by the
 * images module's own immediate Event, never by a visit.
 */
export type DesignEditDiff = Partial<Record<DesignEditableField, DesignFieldChange>> & {
  /** The move a `status_change`, or a rejection's `decision`, records. */
  status?: StatusMove;
  materials?: MaterialUsesDiff;
  images?: ImageChangeDiff;
};

/** A visit's changes, as the Edit screen hands them to History at close. */
export type Visit = {
  before: DesignFields;
  after: DesignFields;
  /**
   * The uses before and after the visit. The Edit screen always sends the pair,
   * changed or not, so emptiness is decided here; a caller that does not track
   * uses may omit it.
   */
  materialUses?: MaterialUsesPair;
};

/** One append-only entry in a Design's History, with its diff parsed. */
export type DesignEvent = {
  id: string;
  designId: string;
  kind: DesignEventKind;
  reason: string | null;
  potentialImprovements: string | null;
  diff: DesignEditDiff | null;
  createdAt: number;
};

/** A stored Event row, before its JSON diff is parsed. */
type DesignEventRow = Omit<DesignEvent, "diff"> & {
  diff: string | null;
};

/**
 * The diff for one visit: the fields whose values differ, each carrying
 * its old and new value, or null when the visit changed nothing. Pure, so
 * coalescing is tested without a screen or a database (ADR-0004).
 */
export function diffDesignFields(before: DesignFields, after: DesignFields): DesignEditDiff | null {
  const diff: DesignEditDiff = {};

  for (const field of DESIGN_EDITABLE_FIELDS) {
    const from = before[field];
    const to = after[field];

    if (from !== to) diff[field] = { from, to };
  }

  return Object.keys(diff).length === 0 ? null : diff;
}

/** A stored use, without what History never stores. */
function materialUseChangeOf(materialUse: MaterialUse): RecordedMaterialUse {
  return {
    id: materialUse.id,
    materialId: materialUse.materialId,
    materialName: materialUse.materialName,
    colour: materialUse.colour,
    role: materialUse.role,
  };
}

/**
 * What one visit did to a Design's Material uses: the uses it added, the uses
 * it removed, and the uses it corrected. A use is identified by its id, so a
 * correction is compared by Material, colour, and role rather than by name.
 * Null when the uses are unchanged. Pure, so the three kinds are tested without
 * a screen or a database (ADR-0004).
 */
export function diffMaterialUses(
  before: readonly MaterialUse[],
  after: readonly MaterialUse[],
): MaterialUsesDiff | null {
  const beforeById = new Map(before.map((materialUse) => [materialUse.id, materialUse]));
  const afterById = new Map(after.map((materialUse) => [materialUse.id, materialUse]));
  const added: RecordedMaterialUse[] = [];
  const removed: RecordedMaterialUse[] = [];
  const changed: MaterialUseCorrection[] = [];

  for (const [id, materialUse] of afterById) {
    const previous = beforeById.get(id);

    if (!previous) {
      added.push(materialUseChangeOf(materialUse));
      continue;
    }

    if (
      previous.materialId !== materialUse.materialId ||
      previous.colour !== materialUse.colour ||
      previous.role !== materialUse.role
    ) {
      changed.push({
        from: materialUseChangeOf(previous),
        to: materialUseChangeOf(materialUse),
      });
    }
  }

  for (const [id, materialUse] of beforeById) {
    if (!afterById.has(id)) removed.push(materialUseChangeOf(materialUse));
  }

  if (added.length + removed.length + changed.length === 0) return null;

  return {
    ...(added.length > 0 && { added }),
    ...(removed.length > 0 && { removed }),
    ...(changed.length > 0 && { changed }),
  };
}

/** One Material use written the way History reads it: name, colour, role. */
function materialUseWords(materialUse: RecordedMaterialUse): string {
  return `${materialUse.materialName} (${materialUse.colour}, ${materialUse.role})`;
}

/**
 * Every Material use line one Event holds, in added, removed, and corrected
 * order. The wording lives here, beside the diff it reads, so the screen only
 * decides where a line sits.
 */
export function materialUseLines(materials: MaterialUsesDiff | undefined): MaterialUseLine[] {
  if (!materials) return [];

  return [
    ...(materials.added ?? []).map((materialUse) => ({
      key: `added:${materialUse.id}`,
      text: `${materialUseWords(materialUse)} added`,
    })),
    ...(materials.removed ?? []).map((materialUse) => ({
      key: `removed:${materialUse.id}`,
      text: `${materialUseWords(materialUse)} removed`,
    })),
    ...(materials.changed ?? []).map(({ from, to }) => ({
      key: `changed:${from.id}`,
      text: `${materialUseWords(from)} changed to ${materialUseWords(to)}`,
    })),
  ];
}

/** A diff row as stored, including the key rows written before #29 carry. */
type StoredDesignEditDiff = DesignEditDiff & {
  materialUses?: { added: RecordedMaterialUse[] };
};

function parseDiff(raw: string | null): DesignEditDiff | null {
  if (raw === null) return null;

  const { materialUses, ...stored } = JSON.parse(raw) as StoredDesignEditDiff;

  // Rows written before `materials` existed keep rendering as they did: their
  // added uses are read under the one key the rest of History now speaks.
  if (!materialUses || stored.materials) return stored;

  return { ...stored, materials: { added: materialUses.added } };
}

export function toDesignEvent(row: DesignEventRow): DesignEvent {
  return { ...row, diff: parseDiff(row.diff) };
}

const eventColumns = {
  id: designEvents.id,
  designId: designEvents.designId,
  kind: designEvents.kind,
  reason: designEvents.reason,
  potentialImprovements: designEvents.potentialImprovements,
  diff: designEvents.diff,
  createdAt: designEvents.createdAt,
};

/**
 * The History read for one Design, newest first. Equal timestamps fall back to
 * insertion order, so two events written in the same millisecond still read in
 * the order they happened.
 */
function designEventsQuery(database: Database, designId: string) {
  return database.db
    .select(eventColumns)
    .from(designEvents)
    .where(eq(designEvents.designId, designId))
    .orderBy(desc(designEvents.createdAt), desc(sql`design_events.rowid`));
}

/** The one row shape History's live read produces, before the hook adds status. */
export type DesignHistoryRows = {
  events: DesignEvent[];
  /** Every Category and Collection name, deleted entries included (#7). */
  taxonomy: TaxonomyNames;
};

/**
 * History's one read: Events, Categories and Collections together, with all
 * three tables declared beside the query (ADR-0005). A rename or an edit
 * refreshes both parts together; the name read keeps deleted entries so an
 * Event does not relabel them as unknown.
 */
export function designHistoryRead(designId: string): LiveReadDeclaration<DesignHistoryRows> {
  return declareLiveRead<DesignHistoryRows>({
    tables: [designEvents, categories, collections],
    read: (database) => ({
      events: designEventsQuery(database, designId).all().map(toDesignEvent),
      taxonomy: readTaxonomyNames(database),
    }),
    empty: {
      events: [],
      taxonomy: { categories: new Map(), collections: new Map() },
    },
  });
}

/**
 * Records one visit: diffs the fields before and after, diffs the
 * Material uses it was handed, then appends a single Event when anything
 * changed. A visit that changed nothing writes nothing and returns null.
 * Written once, never updated: a later visit appends another Event.
 */
export function recordEdit(
  database: Database,
  designId: string,
  visit: Visit,
  now: number = Date.now(),
): DesignEvent | null {
  const diff: DesignEditDiff = diffDesignFields(visit.before, visit.after) ?? {};
  const materials = visit.materialUses
    ? diffMaterialUses(visit.materialUses.before, visit.materialUses.after)
    : null;

  if (materials) diff.materials = materials;

  if (Object.keys(diff).length === 0) return null;

  const event: DesignEvent = {
    id: database.newId(),
    designId,
    kind: "edit",
    reason: null,
    potentialImprovements: null,
    diff,
    createdAt: now,
  };

  database.db
    .insert(designEvents)
    .values({ ...event, diff: JSON.stringify(diff) })
    .run();

  return event;
}

/** The empty answer an image change gives: nothing was attached, removed, or reclassified. */
function isEmptyImageChange(changes: ImageChangeRows): boolean {
  return (
    (changes.attached?.length ?? 0) === 0 &&
    (changes.removed?.length ?? 0) === 0 &&
    (changes.reclassified?.length ?? 0) === 0
  );
}

/** The part of one Image row History keeps. */
function recordedImage(image: ImageRow): RecordedImage {
  return {
    id: image.id,
    kind: image.kind,
    contentHash: image.contentHash,
    extension: image.extension,
  };
}

/** The diff History stores for the whole rows one action touched. */
function recordedImageChanges(changes: ImageChangeRows): ImageChangeDiff {
  return {
    ...(changes.attached && { attached: changes.attached.map(recordedImage) }),
    ...(changes.removed && { removed: changes.removed.map(recordedImage) }),
    ...(changes.reclassified && {
      reclassified: changes.reclassified.map(({ from, to }) => ({
        from: recordedImage(from),
        to: recordedImage(to),
      })),
    }),
  };
}

/**
 * Records one structural image action — an attach, a remove, or a
 * reclassification — as a single `image_change` Event. The images module hands
 * the whole Image rows the action touched and the identity it took from the
 * Database port; History projects its own record of each, so a field it keeps
 * changes only here. This writer owns the row, the kind, and the diff encoding,
 * and nothing else appends an image Event. It writes through `db` so the images
 * module can pass its transaction's handle, keeping the Event beside the rows
 * it describes. An empty change writes nothing and returns null.
 */
export function recordImageChange(
  db: DatabaseHandle,
  {
    id,
    designId,
    changes,
    createdAt,
  }: { id: string; designId: string; changes: ImageChangeRows; createdAt: number },
): DesignEvent | null {
  if (isEmptyImageChange(changes)) return null;

  const event: DesignEvent = {
    id,
    designId,
    kind: "image_change",
    reason: null,
    potentialImprovements: null,
    diff: { images: recordedImageChanges(changes) },
    createdAt,
  };

  db.insert(designEvents)
    .values({ ...event, diff: JSON.stringify(event.diff) })
    .run();

  return event;
}

/** All Events kept for one Design, newest first, with each diff parsed. */
export function listDesignEvents(database: Database, designId: string): DesignEvent[] {
  return designEventsQuery(database, designId)
    .all()
    .map((row) => toDesignEvent(row));
}
