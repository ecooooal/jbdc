import { desc, eq, sql } from 'drizzle-orm';
import type { Database, DesignEventKind } from '@/features/database';
import { designEvents } from '@/features/database';
import {
  DESIGN_EDITABLE_FIELDS,
  type DesignEditableField,
  type DesignFields,
  type MaterialUse,
} from '@/features/designs';

/** What one field was before an edit and what it became. Null means empty. */
export type DesignFieldChange = {
  from: string | null;
  to: string | null;
};

/** One Material use a session added, removed, or corrected, as History reads it back. */
export type MaterialUseChange = Omit<MaterialUse, 'designId' | 'createdAt'>;

/** A corrected Material use: what it was before the visit and what it became. */
export type MaterialUseCorrection = {
  from: MaterialUseChange;
  to: MaterialUseChange;
};

/** What one editing session did to a Design's Material uses. */
export type DesignMaterialsChange = {
  added?: MaterialUseChange[];
  removed?: MaterialUseChange[];
  changed?: MaterialUseCorrection[];
};

/** One line History prints for a Material use, keyed for rendering. */
export type MaterialUseLine = {
  key: string;
  text: string;
};

/**
 * What one editing session changed: the fields whose values differ, each with
 * its old and new value, plus the Material uses it added, removed, or
 * corrected. The uses are a key of their own rather than a field, because they
 * live in their own table; an Event written before that key existed simply has
 * no `materials`.
 */
export type DesignEditDiff = Partial<Record<DesignEditableField, DesignFieldChange>> & {
  materials?: DesignMaterialsChange;
};

/** A visit's changes, as the Edit screen hands them to History at close. */
export type EditSession = {
  before: DesignFields;
  after: DesignFields;
  addedMaterialUses?: readonly MaterialUse[];
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
type DesignEventRow = Omit<DesignEvent, 'diff'> & {
  diff: string | null;
};

/**
 * The diff for one edit session: the fields whose values differ, each carrying
 * its old and new value, or null when the session changed nothing. Pure, so
 * coalescing is tested without a screen or a database (ADR-0004).
 */
export function diffDesignFields(
  before: DesignFields,
  after: DesignFields
): DesignEditDiff | null {
  const diff: DesignEditDiff = {};

  for (const field of DESIGN_EDITABLE_FIELDS) {
    const from = before[field];
    const to = after[field];

    if (from !== to) diff[field] = { from, to };
  }

  return Object.keys(diff).length === 0 ? null : diff;
}

/** A stored use, without what History never stores. */
function materialUseChangeOf(use: MaterialUse): MaterialUseChange {
  return {
    id: use.id,
    materialId: use.materialId,
    materialName: use.materialName,
    colour: use.colour,
    role: use.role,
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
  after: readonly MaterialUse[]
): DesignMaterialsChange | null {
  const beforeById = new Map(before.map((use) => [use.id, use]));
  const afterById = new Map(after.map((use) => [use.id, use]));
  const added: MaterialUseChange[] = [];
  const removed: MaterialUseChange[] = [];
  const changed: MaterialUseCorrection[] = [];

  for (const [id, use] of afterById) {
    const previous = beforeById.get(id);

    if (!previous) {
      added.push(materialUseChangeOf(use));
      continue;
    }

    if (
      previous.materialId !== use.materialId ||
      previous.colour !== use.colour ||
      previous.role !== use.role
    ) {
      changed.push({
        from: materialUseChangeOf(previous),
        to: materialUseChangeOf(use),
      });
    }
  }

  for (const [id, use] of beforeById) {
    if (!afterById.has(id)) removed.push(materialUseChangeOf(use));
  }

  if (added.length + removed.length + changed.length === 0) return null;

  return {
    ...(added.length > 0 && { added }),
    ...(removed.length > 0 && { removed }),
    ...(changed.length > 0 && { changed }),
  };
}

/** One Material use written the way History reads it: name, colour, role. */
function materialUseWords(use: MaterialUseChange): string {
  return `${use.materialName} (${use.colour}, ${use.role})`;
}

/**
 * Every Material use line one Event holds, in added, removed, and corrected
 * order. The wording lives here, beside the diff it reads, so the screen only
 * decides where a line sits.
 */
export function materialUseLines(materials: DesignMaterialsChange | undefined): MaterialUseLine[] {
  if (!materials) return [];

  return [
    ...(materials.added ?? []).map((use) => ({
      key: `added:${use.id}`,
      text: `${materialUseWords(use)} added`,
    })),
    ...(materials.removed ?? []).map((use) => ({
      key: `removed:${use.id}`,
      text: `${materialUseWords(use)} removed`,
    })),
    ...(materials.changed ?? []).map(({ from, to }) => ({
      key: `changed:${from.id}`,
      text: `${materialUseWords(from)} changed to ${materialUseWords(to)}`,
    })),
  ];
}

/** A diff row as stored, including the key rows written before #29 carry. */
type StoredDesignEditDiff = DesignEditDiff & {
  materialUses?: { added: MaterialUseChange[] };
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
export function designEventsQuery(database: Database, designId: string) {
  return database.db
    .select(eventColumns)
    .from(designEvents)
    .where(eq(designEvents.designId, designId))
    .orderBy(desc(designEvents.createdAt), desc(sql`design_events.rowid`));
}

/**
 * Records one edit session: diffs the fields before and after, adds the
 * Material uses the visit changed, then appends a single Event when anything
 * changed. A session that changed nothing writes nothing and returns null.
 * Written once, never updated: a later session appends another Event.
 */
export function recordEdit(
  database: Database,
  designId: string,
  session: EditSession,
  now: number = Date.now()
): DesignEvent | null {
  const diff: DesignEditDiff = diffDesignFields(session.before, session.after) ?? {};
  const materials = diffMaterialUses([], session.addedMaterialUses ?? []);

  if (materials) diff.materials = materials;

  if (Object.keys(diff).length === 0) return null;

  const event: DesignEvent = {
    id: database.newId(),
    designId,
    kind: 'edit',
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

/** All Events kept for one Design, newest first, with each diff parsed. */
export function listDesignEvents(database: Database, designId: string): DesignEvent[] {
  return designEventsQuery(database, designId)
    .all()
    .map((row) => toDesignEvent(row));
}
