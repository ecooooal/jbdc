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

/** One Material use a session added, as History reads it back. */
export type MaterialUseChange = Omit<MaterialUse, 'designId' | 'createdAt'>;

/**
 * What one editing session changed: the fields whose values differ, each with
 * its old and new value, plus the Material uses it added. The uses are a key of
 * their own rather than a field, because they live in their own table; an Event
 * written before uses existed simply has no `materialUses`.
 */
export type DesignEditDiff = Partial<Record<DesignEditableField, DesignFieldChange>> & {
  materialUses?: { added: MaterialUseChange[] };
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

function parseDiff(raw: string | null): DesignEditDiff | null {
  return raw === null ? null : (JSON.parse(raw) as DesignEditDiff);
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
 * Material uses the visit added, then appends a single Event when anything
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
  const added = session.addedMaterialUses ?? [];

  if (added.length > 0) {
    diff.materialUses = {
      added: added.map(({ id, materialId, materialName, colour, role }) => ({
        id,
        materialId,
        materialName,
        colour,
        role,
      })),
    };
  }

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
