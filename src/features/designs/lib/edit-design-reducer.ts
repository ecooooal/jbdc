import type { MaterialUseRole } from '@/features/database';
import {
  DESIGN_CHOICE_FIELDS,
  DESIGN_TEXT_FIELDS,
  draftsFromFields,
  EMPTY_DESIGN_DRAFTS,
  EMPTY_DESIGN_FIELDS,
  type DesignChoiceEditableField,
  type DesignDrafts,
  type DesignEditableField,
  type DesignTextEditableField,
} from './fields';
import { designNameProblem } from './limits';
import {
  createInitialEditMaterialUseState,
  editMaterialUseReducer,
  type EditMaterialUseState,
} from './edit-material-use-reducer';
import { normalizeOptionalText } from './optional-text';
import type {
  DesignFields,
  MaterialUse,
  MaterialUsesPair,
  UpdateDesignInput,
  UpdateMaterialUseInput,
} from './records';
import { DESIGN_SECTIONS, type DesignSectionTab } from './sections';

/**
 * The one Materials editor that can be open: adding a use, or correcting one.
 * They cannot both be open, so they are one field (FRONTEND_STATE).
 */
export type MaterialUsePanel =
  | { kind: 'add' }
  | { kind: 'edit'; editor: EditMaterialUseState };

/**
 * Edit's decisions: the drafts, the record of what its own writes stored, the
 * visit baseline, the one open row, and the one refusal on screen.
 *
 * `stored` and `storedUses` are the record of what this visit's own writes
 * stored, not a copy of the live read (ADR-0004). They are seeded once from the
 * first read, advanced only by a write outcome, and never re-seeded by a later
 * read. They answer what a refused write restores, what a blank name falls back
 * to, and what the Event's after-state is.
 *
 * A visit is one trip through the Edit screen: `visitStart` is the row the
 * first read returned and never advances, so every write in the visit
 * coalesces into one Event at close.
 */
export type EditDesignState = {
  /** The Design this visit edits; every effect names it. */
  designId: string;
  /** False until the first live read seeds the drafts. */
  isSeeded: boolean;
  /** What the owner has typed or picked, not necessarily written yet. */
  draft: DesignDrafts;
  /** The row this visit's own writes stored; a refused write restores these values. */
  stored: DesignFields;
  /** The Material uses this visit's own writes stored, after its additions, corrections, and removals. */
  storedUses: MaterialUse[];
  /** The row at open: what the visit's one Event is diffed against. */
  visitStart: DesignFields | null;
  /** The Material uses the row held at open. */
  visitStartUses: MaterialUse[];
  /** The one row whose editor is open. `taxonomy` is the Category · Collection pair. */
  editing: EditDesignRow | null;
  /** The one Materials editor open: adding a use or correcting one. */
  materialUsePanel: MaterialUsePanel | null;
  /** The section tab Edit is showing. */
  tab: DesignSectionTab;
  error: { field: DesignEditableField; message: string } | null;
  /**
   * Set once the visit closes, with the number of writes it still owes. The
   * visit records its one Event when the last of them reports back, so the
   * Event describes the rows the writes stored, not the drafts that asked.
   */
  closing: { at: number; outstanding: number } | null;
};

export type EditDesignRow = DesignEditableField | 'taxonomy';

export type EditDesignEvent =
  | { type: 'design-loaded'; design: DesignFields; materialUses?: readonly MaterialUse[] }
  | { type: 'text-changed'; field: DesignTextEditableField; value: string }
  | { type: 'text-row-left'; field: DesignTextEditableField; now: number }
  | { type: 'choice-chosen'; field: DesignChoiceEditableField; value: string | null; now: number }
  | { type: 'material-use-added'; materialUse: MaterialUse }
  | { type: 'material-use-add-opened'; now: number }
  | { type: 'material-use-editor-opened'; materialUse: MaterialUse; now: number }
  | { type: 'material-use-panel-closed'; now: number }
  | { type: 'material-use-colour-changed'; colour: string }
  | { type: 'material-use-colour-committed'; now: number }
  | { type: 'material-use-material-chosen'; materialId: string; now: number }
  | { type: 'material-use-role-chosen'; role: MaterialUseRole; now: number }
  | { type: 'material-use-saved'; materialUse: MaterialUse }
  | { type: 'material-use-refused'; useId: string; message: string }
  | { type: 'material-use-remove-pressed'; now: number }
  | { type: 'material-use-removed'; useId: string }
  | { type: 'row-opened'; row: EditDesignRow; now: number }
  | { type: 'tab-changed'; tab: DesignSectionTab; now: number }
  | { type: 'row-closed' }
  | { type: 'drafts-written'; design: DesignFields; patch: UpdateDesignInput }
  | { type: 'field-refused'; field: DesignEditableField; message: string }
  /** A write found no Design row to store into: the row is no longer in the catalog. */
  | { type: 'nothing-stored'; designId: string }
  | { type: 'app-backgrounded'; now: number }
  | { type: 'visit-closed'; now: number };

/**
 * The gestures that carry the time they happened. The screen sends each of
 * these without a clock — the visit hook stamps it — so the reducer still never
 * reads one and no test depends on the wall clock.
 */
const TIMED_GESTURES = [
  'text-row-left',
  'choice-chosen',
  'material-use-add-opened',
  'material-use-editor-opened',
  'material-use-panel-closed',
  'material-use-colour-committed',
  'material-use-material-chosen',
  'material-use-role-chosen',
  'material-use-remove-pressed',
  'row-opened',
  'tab-changed',
  'app-backgrounded',
  'visit-closed',
] as const satisfies readonly Extract<EditDesignEvent, { now: number }>['type'][];

type TimedGestureType = (typeof TIMED_GESTURES)[number];

/** An event with the clock left to the visit, or one that never carried one. */
type Clockless<Event> = Event extends { type: TimedGestureType } ? Omit<Event, 'now'> : Event;

/** What the screen sends: a fact, with the time it happened left to the visit. */
export type EditDesignGesture = Clockless<EditDesignEvent>;

const TIMED = new Set<string>(TIMED_GESTURES);

/**
 * The visit's one clock: the gesture the screen sends becomes the event the
 * reducer handles, stamped with the time the visit saw it. The screen never
 * reads a clock and the reducer never reads one either (`FRONTEND_STATE` 5).
 */
export function stampedEvent(gesture: EditDesignGesture, now: number): EditDesignEvent {
  // The visit's one cast, and its whole point: `EditDesignGesture` is this
  // event union with the clock removed from exactly the gestures above, so
  // putting the time back yields events the reducer already handles.
  return (TIMED.has(gesture.type) ? { ...gesture, now } : gesture) as EditDesignEvent;
}

/**
 * The work a visit asks for. `write-drafts`, `write-material-use`,
 * `remove-material-use`, and `record-visit` are separate because leaving the
 * app flushes a draft but records nothing, while a close does all of them. The
 * runner makes one call per effect and dispatches the outcome back as an event;
 * the screen calls no record module itself.
 */
export type EditDesignEffect =
  | { type: 'write-drafts'; designId: string; patch: UpdateDesignInput; now: number }
  | {
      type: 'write-material-use';
      designId: string;
      useId: string;
      patch: UpdateMaterialUseInput;
      now: number;
    }
  | { type: 'remove-material-use'; designId: string; useId: string; now: number }
  | {
      type: 'record-visit';
      designId: string;
      before: DesignFields;
      after: DesignFields;
      /** The uses before and after the visit; History decides whether they differ. */
      materialUses: MaterialUsesPair;
      now: number;
    };

export type EditDesignResult = {
  state: EditDesignState;
  effects: EditDesignEffect[];
};

/** The writes that report back: everything the visit asks a row to store. */
type DraftsWrite = Extract<EditDesignEffect, { type: 'write-drafts' }>;
type MaterialUseWrite = Extract<EditDesignEffect, { type: 'write-material-use' }>;
type RemovalWrite = Extract<EditDesignEffect, { type: 'remove-material-use' }>;

/**
 * What one write answered: the row it stored, its refusal, or nothing at all
 * because what it targeted is no longer stored — the Design's row for a field
 * write, the use itself for a removal.
 */
export type WriteReport<Stored> =
  | { kind: 'stored'; value: Stored }
  | { kind: 'refused'; message: string }
  | { kind: 'nothing-stored' };

/**
 * What a write with no refusal rule answered. Its port returns the row it
 * stored or nothing, so it can never report a refusal.
 */
export type StoredOrNothingReport<Stored> = Exclude<WriteReport<Stored>, { kind: 'refused' }>;

/**
 * One write the visit declared and the answer it got. The effect's own fields
 * say which write this was, so a report cannot be paired with another kind.
 */
export type WriteAttempt =
  | (DraftsWrite & { report: WriteReport<DesignFields> })
  | (MaterialUseWrite & { report: WriteReport<MaterialUse> })
  | (RemovalWrite & { report: StoredOrNothingReport<MaterialUse> });

/**
 * The one place a write's answer becomes the event the visit settles on. The
 * runner calls it once per write and dispatches whatever comes back, so every
 * answer — including one from a row that is gone — settles somewhere.
 */
export function writeOutcome(attempt: WriteAttempt): EditDesignEvent {
  const { type, designId, report } = attempt;

  // A removal's answer is about the use, not the Design. It either deleted the
  // use or found it already gone, and either way the use is no longer recorded:
  // the visit closes the editor, drops the use from its record, and can still
  // record its Event for the Design that exists. A removal never reports the
  // Design gone, so it never reports nothing stored.
  if (type === 'remove-material-use') {
    return {
      type: 'material-use-removed',
      useId: report.kind === 'stored' ? report.value.id : attempt.useId,
    };
  }

  // Every other write targets the Design's row: nothing stored means that row
  // is no longer in the catalog, so the visit has nothing to record against.
  if (report.kind === 'nothing-stored') return { type: 'nothing-stored', designId };

  switch (type) {
    // Only a name has a rule to refuse: every other field stores what it is given.
    case 'write-drafts':
      return report.kind === 'stored'
        ? { type: 'drafts-written', design: report.value, patch: attempt.patch }
        : { type: 'field-refused', field: 'name', message: report.message };
    case 'write-material-use':
      return report.kind === 'stored'
        ? { type: 'material-use-saved', materialUse: report.value }
        : { type: 'material-use-refused', useId: attempt.useId, message: report.message };
  }
}

export function createInitialEditDesignState(designId: string): EditDesignState {
  return {
    designId,
    isSeeded: false,
    draft: EMPTY_DESIGN_DRAFTS,
    stored: EMPTY_DESIGN_FIELDS,
    storedUses: [],
    visitStart: null,
    visitStartUses: [],
    editing: null,
    materialUsePanel: null,
    tab: DESIGN_SECTIONS[0].tab,
    error: null,
    closing: null,
  };
}

/** The text drafts that still differ from the row, ready for `updateDesign`. */
type UnwrittenDesignFields = Partial<Record<DesignTextEditableField, string>>;

/** One field's draft, as the write it asks for. */
function draftPatch<T extends DesignEditableField>(
  field: T,
  value: DesignFields[T]
): UpdateDesignInput {
  return { [field]: value };
}

/**
 * The drafts the row has not seen yet. Only text is drafted; a Category or
 * Collection writes the moment it is chosen. An invalid name is never here,
 * so closing the screen cannot commit a blank one.
 *
 * This narrows a write to the fields it should carry; it is not a second rule
 * for whether the visit changed anything. It asks the same
 * `normalizeOptionalText` the store writes with, so a field skipped here is one
 * the store would have left alone. Emptiness is History's, decided once in
 * `recordEdit`.
 */
function unwrittenFields(state: EditDesignState): UnwrittenDesignFields | null {
  const patch: UnwrittenDesignFields = {};

  for (const field of DESIGN_TEXT_FIELDS) {
    const draft = state.draft[field];

    if (field === 'name') {
      const name = draft.trim();

      if (name !== state.stored.name && designNameProblem(name) === null) patch.name = name;
      continue;
    }

    if (normalizeOptionalText(draft) !== state.stored[field]) patch[field] = draft;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}

/**
 * The Material use fields the editor holds but the row has not seen. Material
 * and role write on choice, so this is usually only a typed colour; a blank
 * colour is not a change, because a use always needs one. Null means no write.
 */
function unwrittenMaterialUseFields(
  editor: EditMaterialUseState | null
): UpdateMaterialUseInput | null {
  if (!editor) return null;

  const patch: UpdateMaterialUseInput = {};

  if (editor.materialId !== editor.saved.materialId) patch.materialId = editor.materialId;

  const colour = editor.colour.trim();

  if (colour.length > 0 && colour !== editor.saved.colour) patch.colour = editor.colour;
  if (editor.role !== editor.saved.role) patch.role = editor.role;

  return Object.keys(patch).length === 0 ? null : patch;
}

/** The editor an open correction holds, or null while adding or closed. */
function editingMaterialUse(state: EditDesignState): EditMaterialUseState | null {
  return state.materialUsePanel?.kind === 'edit' ? state.materialUsePanel.editor : null;
}

/** The write an open Material use editor still owes, if any. */
function materialUseFlushEffects(state: EditDesignState, now: number): EditDesignEffect[] {
  const editor = editingMaterialUse(state);
  const patch = unwrittenMaterialUseFields(editor);

  if (!editor || !patch) return [];

  return [
    {
      type: 'write-material-use',
      designId: state.designId,
      useId: editor.saved.id,
      patch,
      now,
    },
  ];
}

/**
 * The one Event a close records: the row it opened on and the row the writes
 * left behind. Whether that is a change is History's to decide, with the same
 * diff it stores — the visit does not keep a second rule for emptiness. The
 * after-state is what `stored` and `storedUses` hold when the last write
 * reports back, so a refused write is never recorded as if it landed.
 */
function recordEffect(state: EditDesignState, at: number): EditDesignEffect | null {
  const before = state.visitStart;

  if (!before) return null;

  return {
    type: 'record-visit',
    designId: state.designId,
    before,
    after: state.stored,
    materialUses: { before: state.visitStartUses, after: state.storedUses },
    now: at,
  };
}

/**
 * One write the visit declared has reported back. When the last one settles,
 * the close records the visit; until then the Event is not written, so it can
 * never describe a row the write did not store.
 */
function settled(state: EditDesignState): EditDesignResult {
  const closing = state.closing;

  if (!closing || closing.outstanding === 0) return only(state);

  const next = {
    ...state,
    closing: { ...closing, outstanding: closing.outstanding - 1 },
  };

  if (next.closing.outstanding > 0) return only(next);

  const effect = recordEffect(next, closing.at);

  return effect ? { state: next, effects: [effect] } : only(next);
}

/**
 * A write found no Design row to store into: the Design this visit edits is no
 * longer in the catalog. The close stops waiting, because no write it still
 * owes can be stored either, and records no Event, because there is no row to
 * describe. Nothing is shown for it: the screen has nothing left to show.
 */
function settledWithoutRow(state: EditDesignState): EditDesignResult {
  const closing = state.closing;

  if (!closing) return only(state);

  return only({ ...state, closing: { at: closing.at, outstanding: 0 } });
}

/** The drafts a confirmed write updates: only the fields it stored. */
function draftsAfterWrite(
  draft: DesignDrafts,
  design: DesignFields,
  patch: UpdateDesignInput
): DesignDrafts {
  const next = { ...draft };

  for (const field of DESIGN_TEXT_FIELDS) {
    if (field in patch) next[field] = design[field] ?? '';
  }

  for (const field of DESIGN_CHOICE_FIELDS) {
    if (field in patch) next[field] = design[field];
  }

  return next;
}

/** The row a confirmed write collapses: the one it stored, if it is still open. */
function collapsedRow(
  editing: EditDesignRow | null,
  patch: UpdateDesignInput
): EditDesignRow | null {
  if (editing === null || editing === 'taxonomy') return editing;

  return editing in patch ? null : editing;
}

/** Clears the refusal for the field that just changed, and only that field. */
function clearedError(
  error: EditDesignState['error'],
  field: DesignEditableField
): EditDesignState['error'] {
  return error?.field === field ? null : error;
}

function isChoiceField(field: DesignEditableField): field is DesignChoiceEditableField {
  return DESIGN_CHOICE_FIELDS.some((choice) => choice === field);
}

function only(state: EditDesignState): EditDesignResult {
  return { state, effects: [] };
}

/** The result with the visit's one open Materials editor replaced. */
function withPanel(result: EditDesignResult, panel: MaterialUsePanel | null): EditDesignResult {
  return { ...result, state: { ...result.state, materialUsePanel: panel } };
}

/**
 * The one flush behind every gesture that leaves a draft behind: it writes what
 * the visit still owes and returns the state the gesture moves to. The gestures
 * differ in two ways, so both are arguments: `writesDrafts` — a row swap writes
 * the visit's drafts only when it left a text row, every other gesture writes
 * them all — and `records`, which only a close sets. "How many writes are still
 * owed" stays the visit's own bookkeeping.
 *
 * `next` still holds the Material use panel that was open, because its colour
 * is part of what the flush owes; the caller closes or replaces it on the
 * result.
 */
function flush(
  next: EditDesignState,
  now: number,
  { writesDrafts, records }: { writesDrafts: boolean; records: boolean }
): EditDesignResult {
  const effects = materialUseFlushEffects(next, now);
  const patch = writesDrafts ? unwrittenFields(next) : null;

  if (patch) {
    effects.push({ type: 'write-drafts', designId: next.designId, patch, now });
  }

  if (!records) return effects.length === 0 ? only(next) : { state: next, effects };

  // A close arms the visit with the writes it just declared, so the Event waits
  // for the rows those writes store rather than the drafts that asked for it.
  const closed: EditDesignState = {
    ...next,
    closing: { at: now, outstanding: effects.length },
  };

  if (effects.length > 0) return { state: closed, effects };

  const recorded = recordEffect(closed, now);

  return { state: closed, effects: recorded ? [recorded] : [] };
}

/**
 * The state after the owner leaves a row: a blank name falls back to the
 * stored one, and a refusal on the row being left clears. The caller decides
 * what opens next.
 */
function leftRow(state: EditDesignState, leaving: EditDesignRow | null): EditDesignState {
  const invalidName = leaving === 'name' && designNameProblem(state.draft.name) !== null;

  return {
    ...state,
    draft: invalidName ? { ...state.draft, name: state.stored.name } : state.draft,
    error: state.error?.field === leaving ? null : state.error,
  };
}

export function editDesignReducer(
  state: EditDesignState,
  event: EditDesignEvent
): EditDesignResult {
  switch (event.type) {
    case 'design-loaded': {
      // A later read never re-seeds an open visit: `stored` is the record of
      // this visit's own writes, and a read has not observed them.
      if (state.isSeeded) return only(state);

      return only({
        ...state,
        isSeeded: true,
        draft: draftsFromFields(event.design),
        stored: event.design,
        storedUses: [...(event.materialUses ?? [])],
        visitStart: event.design,
        visitStartUses: [...(event.materialUses ?? [])],
        editing: null,
        materialUsePanel: null,
        error: null,
      });
    }
    case 'text-changed':
      return only({
        ...state,
        draft: { ...state.draft, [event.field]: event.value },
        error: clearedError(state.error, event.field),
      });
    case 'text-row-left': {
      // Leaving a text row writes what it holds; whether that is a change is
      // the write's to decide, not the visit's.
      const next = leftRow(state, event.field);

      return {
        state: next,
        effects: [
          {
            type: 'write-drafts',
            designId: next.designId,
            patch: draftPatch(event.field, state.draft[event.field]),
            now: event.now,
          },
        ],
      };
    }
    case 'choice-chosen': {
      const next = {
        ...state,
        draft: { ...state.draft, [event.field]: event.value },
        error: clearedError(state.error, event.field),
      };

      return {
        state: next,
        effects: [
          {
            type: 'write-drafts',
            designId: state.designId,
            patch: draftPatch(event.field, event.value),
            now: event.now,
          },
        ],
      };
    }
    case 'material-use-added':
      // The use is already written; the visit only keeps it for the Event it
      // records at close, so adding one does not end the visit.
      return only({
        ...state,
        materialUsePanel: null,
        storedUses: [...state.storedUses, event.materialUse],
      });
    case 'material-use-add-opened': {
      // One editor at a time: a text row being left is written, and a Material
      // use editor being left writes the colour it still owes.
      const flushed = flush(
        { ...leftRow(state, state.editing), editing: null },
        event.now,
        { writesDrafts: true, records: false }
      );

      return withPanel(flushed, { kind: 'add' });
    }
    case 'material-use-editor-opened': {
      const flushed = flush(
        { ...leftRow(state, state.editing), editing: null },
        event.now,
        { writesDrafts: true, records: false }
      );
      const panel: MaterialUsePanel = {
        kind: 'edit',
        editor: createInitialEditMaterialUseState(event.materialUse),
      };

      return withPanel(flushed, panel);
    }
    case 'material-use-panel-closed':
      return withPanel({ state, effects: materialUseFlushEffects(state, event.now) }, null);
    case 'material-use-colour-changed': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      return only({
        ...state,
        materialUsePanel: {
          kind: 'edit',
          editor: editMaterialUseReducer(editor, {
            type: 'colour-changed',
            colour: event.colour,
          }),
        },
      });
    }
    case 'material-use-colour-committed':
      return { state, effects: materialUseFlushEffects(state, event.now) };
    case 'material-use-material-chosen': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      const next = {
        ...state,
        materialUsePanel: {
          kind: 'edit' as const,
          editor: editMaterialUseReducer(editor, {
            type: 'material-chosen',
            materialId: event.materialId,
          }),
        },
      };

      return { state: next, effects: materialUseFlushEffects(next, event.now) };
    }
    case 'material-use-role-chosen': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      const next = {
        ...state,
        materialUsePanel: {
          kind: 'edit' as const,
          editor: editMaterialUseReducer(editor, { type: 'role-chosen', role: event.role }),
        },
      };

      return { state: next, effects: materialUseFlushEffects(next, event.now) };
    }
    case 'material-use-saved': {
      const editor = editingMaterialUse(state);
      const isTheSameUse = editor !== null && editor.saved.id === event.materialUse.id;

      return settled({
        ...state,
        // A late outcome for a use the editor has moved on from updates the
        // row, not the open editor.
        materialUsePanel:
          editor && isTheSameUse
            ? {
                kind: 'edit',
                editor: editMaterialUseReducer(editor, {
                  type: 'material-use-saved',
                  materialUse: event.materialUse,
                }),
              }
            : state.materialUsePanel,
        // The correction is already written; the visit keeps what its own write
        // stored, so a use added and then corrected still reads as one addition.
        storedUses: state.storedUses.map((materialUse) =>
          materialUse.id === event.materialUse.id ? event.materialUse : materialUse
        ),
      });
    }
    case 'material-use-refused': {
      const editor = editingMaterialUse(state);

      if (!editor || editor.saved.id !== event.useId) return settled(state);

      return settled({
        ...state,
        materialUsePanel: {
          kind: 'edit',
          editor: editMaterialUseReducer(editor, {
            type: 'material-use-refused',
            message: event.message,
          }),
        },
      });
    }
    case 'material-use-remove-pressed': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      return {
        state,
        effects: [
          {
            type: 'remove-material-use',
            designId: state.designId,
            useId: editor.saved.id,
            now: event.now,
          },
        ],
      };
    }
    case 'material-use-removed':
      return only({
        ...state,
        materialUsePanel: null,
        storedUses: state.storedUses.filter((use) => use.id !== event.useId),
      });
    case 'row-opened': {
      const leaving = state.editing;
      const leavingTextRow =
        leaving !== null && leaving !== event.row && leaving !== 'taxonomy' && !isChoiceField(leaving);

      // A row unmounted on iOS does not reliably fire blur, so opening another
      // row writes the one being left. Only a text row owes a draft; the visit
      // still records one Event.
      const flushed = flush(
        { ...leftRow(state, leaving), editing: event.row },
        event.now,
        { writesDrafts: leavingTextRow, records: false }
      );

      return withPanel(flushed, null);
    }
    case 'tab-changed': {
      if (event.tab === state.tab) return only(state);

      // A tab is unmounted on iOS without firing blur, so the tab change
      // writes the draft it holds, plus any Material use editor it closes. It
      // records nothing: the visit is still open.
      const flushed = flush(
        { ...leftRow(state, state.editing), tab: event.tab, editing: null },
        event.now,
        { writesDrafts: true, records: false }
      );

      return withPanel(flushed, null);
    }
    case 'row-closed':
      return only({ ...state, editing: null });
    case 'drafts-written':
      // The row the write stored becomes the visit's record, and the drafts it
      // wrote follow it so a trimmed name shows as it was stored.
      return settled({
        ...state,
        draft: draftsAfterWrite(state.draft, event.design, event.patch),
        stored: event.design,
        editing: collapsedRow(state.editing, event.patch),
        error:
          state.error && state.error.field in event.patch ? null : state.error,
      });
    case 'field-refused':
      return settled({
        ...state,
        draft: {
          ...state.draft,
          [event.field]: isChoiceField(event.field)
            ? state.stored[event.field]
            : (state.stored[event.field] ?? ''),
        },
        error: { field: event.field, message: event.message },
      });
    case 'nothing-stored':
      // A late outcome can belong to a surface that has moved on; only this
      // visit's own row being gone settles it.
      if (event.designId !== state.designId) return only(state);

      return settledWithoutRow(state);
    case 'app-backgrounded':
      // Leaving the foreground flushes a draft; only a close records the visit.
      return state.closing
        ? only(state)
        : flush(state, event.now, { writesDrafts: true, records: false });
    case 'visit-closed': {
      if (state.closing) return only(state);

      const flushed = flush(state, event.now, { writesDrafts: true, records: true });

      return withPanel(flushed, null);
    }
  }
}
