import type { MaterialUseRole } from "@/features/database";
import type { Material } from "@/features/materials";
import {
  addMaterialUseReducer,
  createInitialAddMaterialUseState,
  type AddMaterialUseEvent,
  type AddMaterialUseState,
} from "./add-material-use-reducer";
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
} from "./fields";
import type { InlineCreationEvent } from "./inline-creation-reducer";
import { designNameProblem } from "./limits";
import { normalizeOptionalText } from "./optional-text";
import type {
  DesignChanges,
  DesignFields,
  DesignWriteResult,
  MaterialUse,
  MaterialUseChange,
  MaterialUsesPair,
  UpdateDesignInput,
  UpdateMaterialUseInput,
} from "./records";
import { DESIGN_SECTIONS, type DesignSectionTab } from "./sections";

/**
 * The correction panel's draft and the use its own writes stored. A refusal
 * restores `stored`; the other fields are what the owner sees on screen. Both
 * live in the visit's one panel, so there is no second state to forward into.
 */
export type EditingMaterialUse = {
  /** The use as stored right now; the fields a refusal restores. */
  stored: MaterialUse;
  materialId: string;
  colour: string;
  role: MaterialUseRole;
  error: string | null;
};

/** The one Materials editor that can be open: adding a use, or correcting one. */
export type MaterialUsePanel =
  { kind: "add"; editor: AddMaterialUseState } | ({ kind: "edit" } & EditingMaterialUse);

/** Opens a correction on the use as it is stored. */
function editingMaterialUseFrom(materialUse: MaterialUse): EditingMaterialUse {
  return {
    stored: materialUse,
    materialId: materialUse.materialId,
    colour: materialUse.colour,
    role: materialUse.role,
    error: null,
  };
}

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
  closing: { at: number; writesOwed: number } | null;
};

export type EditDesignRow = DesignEditableField | "taxonomy";

/**
 * What happened while the one Materials panel was open. The visit owns the
 * panel value, so each fact is handled here — there is no second reducer to
 * forward into and no separate event for every field.
 */
export type MaterialUsePanelFact =
  | { type: "closed" }
  | { type: "material-chosen"; materialId: string | null }
  | { type: "colour-changed"; colour: string }
  | { type: "colour-committed" }
  | { type: "role-chosen"; role: MaterialUseRole }
  | { type: "remove-pressed" }
  | { type: "saved"; materialUse: MaterialUse }
  | { type: "refused"; useId: string; message: string }
  /** A correction or removal named a use the write could no longer find. */
  | { type: "use-missing"; useId: string }
  | { type: "use-removed"; useId: string };

export type EditDesignEvent =
  | { type: "design-loaded"; design: DesignFields; materialUses?: readonly MaterialUse[] }
  | { type: "text-changed"; field: DesignTextEditableField; value: string }
  | { type: "text-row-left"; field: DesignTextEditableField; now: number }
  | { type: "choice-chosen"; field: DesignChoiceEditableField; value: string | null; now: number }
  | { type: "material-use-added"; materialUse: MaterialUse }
  | { type: "material-use-add-confirmed"; now: number }
  | { type: "material-use-add-refused"; message: string }
  | { type: "material-use-add-opened"; now: number }
  | { type: "material-use-editor-opened"; materialUse: MaterialUse; now: number }
  | { type: "material-use-inline-fact"; fact: InlineCreationEvent }
  | { type: "material-use-panel-fact"; fact: MaterialUsePanelFact; now: number }
  | { type: "row-opened"; row: EditDesignRow; now: number }
  | { type: "tab-changed"; tab: DesignSectionTab; now: number }
  | { type: "row-closed" }
  | { type: "drafts-written"; design: DesignFields; patch: UpdateDesignInput }
  | { type: "field-refused"; field: DesignEditableField; message: string }
  /** A write found no Design row to store into: the row is no longer in the catalog. */
  | { type: "design-missing"; designId: string }
  /** One declared write reports back. The only event that settles the visit. */
  | { type: "write-settled"; designId: string }
  | { type: "app-backgrounded"; now: number }
  | { type: "visit-closed"; now: number };

/**
 * The gestures that carry the time they happened. The screen sends each of
 * these without a clock — the visit hook stamps it — so the reducer still never
 * reads one and no test depends on the wall clock.
 */
const TIMED_GESTURES = [
  "text-row-left",
  "choice-chosen",
  "material-use-add-confirmed",
  "material-use-add-opened",
  "material-use-editor-opened",
  "material-use-panel-fact",
  "row-opened",
  "tab-changed",
  "app-backgrounded",
  "visit-closed",
] as const satisfies readonly Extract<EditDesignEvent, { now: number }>["type"][];

type TimedGestureType = (typeof TIMED_GESTURES)[number];

/** An event with the clock left to the visit, or one that never carried one. */
type Clockless<Event> = Event extends { type: TimedGestureType } ? Omit<Event, "now"> : Event;

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
 * The work a visit asks for. One `write-design` effect carries every change a
 * flush owes — fields and Material uses together — so the visit names what the
 * owner changed, not which record function to call. `record-visit` is separate
 * because leaving the app flushes a draft but records nothing, while a close
 * does both. The runner makes one write call per effect and dispatches the
 * outcome back as events; the screen calls no record module itself.
 */
export type EditDesignEffect =
  | {
      type: "write-design";
      designId: string;
      /** What the owner changed; the one write path applies all of it. */
      changes: DesignChanges;
      now: number;
    }
  | {
      type: "record-visit";
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

/**
 * What one write answered: the result it stored, the rule that refused it, or
 * nothing because the Design row is no longer in the catalog.
 */
export type WriteAttempt = {
  type: "write-design";
  designId: string;
  changes: DesignChanges;
  now: number;
  result: DesignWriteResult;
};

/** True for the use change whose colour a refusal named: a blank one. */
function refusedUseChange(changes: DesignChanges): MaterialUseChange | undefined {
  return (changes.uses ?? []).find((change) => {
    if (change.kind === "add") return change.input.colour.trim().length === 0;
    if (change.kind === "correct") return change.patch.colour?.trim().length === 0;
    return false;
  });
}

/**
 * The events a refusal produces: only what it refused. The offending field is
 * restored and flagged, an open add or correct panel gets the refusal, and a
 * collateral change gets no event — it was not the reason the write stopped.
 */
function refusalEvents(
  changes: DesignChanges,
  result: Extract<DesignWriteResult, { kind: "refused" }>,
  now: number,
): EditDesignEvent[] {
  if (result.field === "name") {
    return [{ type: "field-refused", field: "name", message: result.message }];
  }

  const change = refusedUseChange(changes);

  if (!change) return [];
  if (change.kind === "add") return [{ type: "material-use-add-refused", message: result.message }];
  if (change.kind === "correct") {
    return [
      {
        type: "material-use-panel-fact",
        fact: { type: "refused", useId: change.useId, message: result.message },
        now,
      },
    ];
  }

  return [];
}

/**
 * The one place a write's answer becomes the events the visit handles. Each
 * declared change gets one event, in declared order, and the answer ends with
 * one `write-settled` — the only event that decrements the close's debt. A
 * refusal names only what it refused; a missing Design row ends the visit.
 * The runner calls this once per write and dispatches whatever comes back.
 */
export function writeOutcome(attempt: WriteAttempt): EditDesignEvent[] {
  const { changes, designId, now, result } = attempt;

  // Every change targets the Design's row: a missing row means the visit has
  // nothing left to record against, so no write can settle it.
  if (result.kind === "design-missing") return [{ type: "design-missing", designId }];

  const settled: EditDesignEvent = { type: "write-settled", designId };

  if (result.kind === "refused") return [...refusalEvents(changes, result, now), settled];

  // The result's per-change outcomes come back in the order the changes were
  // declared, so each declared change gets exactly one event.
  return [
    ...result.outcomes.flatMap((outcome): EditDesignEvent[] => {
      switch (outcome.kind) {
        case "fields":
          return [{ type: "drafts-written", design: outcome.design, patch: changes.fields ?? {} }];
        case "add":
          return [{ type: "material-use-added", materialUse: outcome.materialUse }];
        case "correct":
          return [
            {
              type: "material-use-panel-fact",
              fact: { type: "saved", materialUse: outcome.materialUse },
              now,
            },
          ];
        case "remove":
          return [
            {
              type: "material-use-panel-fact",
              fact: { type: "use-removed", useId: outcome.materialUse.id },
              now,
            },
          ];
        case "use-missing":
          return [
            {
              type: "material-use-panel-fact",
              fact: { type: "use-missing", useId: outcome.useId },
              now,
            },
          ];
      }
    }),
    settled,
  ];
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

/** The text drafts that still differ from the row, ready for `writeDesign`. */
type UnwrittenDesignFields = Partial<Record<DesignTextEditableField, string>>;

/** One field's draft, as the write it asks for. */
function draftPatch<T extends DesignEditableField>(
  field: T,
  value: DesignFields[T],
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

    if (field === "name") {
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
  editor: EditingMaterialUse | null,
): UpdateMaterialUseInput | null {
  if (!editor) return null;

  const patch: UpdateMaterialUseInput = {};

  if (editor.materialId !== editor.stored.materialId) patch.materialId = editor.materialId;

  const colour = editor.colour.trim();

  if (colour.length > 0 && colour !== editor.stored.colour) patch.colour = editor.colour;
  if (editor.role !== editor.stored.role) patch.role = editor.role;

  return Object.keys(patch).length === 0 ? null : patch;
}

/**
 * The picker's options: the live list, plus the stored Material when the owner
 * has removed it from that list, so the editor still opens on the use's current
 * Material. A pure selector over the panel and the live read.
 */
export function materialUseChoices(
  materials: readonly Material[],
  editor: EditingMaterialUse,
): Material[] {
  if (materials.some((material) => material.id === editor.materialId)) return [...materials];

  return [...materials, { id: editor.materialId, name: editor.stored.materialName }];
}

/** The editor an open correction holds, or null while adding or closed. */
function editingMaterialUse(state: EditDesignState): EditingMaterialUse | null {
  return state.materialUsePanel?.kind === "edit" ? state.materialUsePanel : null;
}

/** The choices an open add panel holds, or null while correcting or closed. */
function addingMaterialUse(state: EditDesignState): AddMaterialUseState | null {
  return state.materialUsePanel?.kind === "add" ? state.materialUsePanel.editor : null;
}

/** The state with the add panel's choices replaced. */
function withAddEditor(state: EditDesignState, editor: AddMaterialUseState): EditDesignState {
  return { ...state, materialUsePanel: { kind: "add", editor } };
}

/** Folds one add-editor fact into the open add panel, when one is open. */
function withAddEditorFact(state: EditDesignState, fact: AddMaterialUseEvent): EditDesignResult {
  const editor = addingMaterialUse(state);

  if (!editor) return only(state);

  return only(withAddEditor(state, addMaterialUseReducer(editor, fact)));
}

/** The one effect that asks the write path to apply a set of changes. */
function writeEffect(
  state: EditDesignState,
  changes: DesignChanges,
  now: number,
): EditDesignEffect {
  return { type: "write-design", designId: state.designId, changes, now };
}

/** The Material use change an open editor still owes, if any. */
function unwrittenUseChanges(state: EditDesignState): MaterialUseChange[] {
  const editor = editingMaterialUse(state);
  const patch = unwrittenMaterialUseFields(editor);

  return editor && patch ? [{ kind: "correct", useId: editor.stored.id, patch }] : [];
}

/** The write an open Material use editor still owes, if any. */
function materialUseFlushEffects(state: EditDesignState, now: number): EditDesignEffect[] {
  const changes = unwrittenUseChanges(state);

  return changes.length === 0 ? [] : [writeEffect(state, { uses: changes }, now)];
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
    type: "record-visit",
    designId: state.designId,
    before,
    after: state.stored,
    materialUses: { before: state.visitStartUses, after: state.storedUses },
    now: at,
  };
}

/**
 * One write the visit declared has reported back. When the last of the writes
 * it owes settles, the close records the visit; until then the Event is not
 * written, so it can never describe a row the write did not store.
 */
function settled(state: EditDesignState): EditDesignResult {
  const closing = state.closing;

  if (!closing || closing.writesOwed === 0) return only(state);

  const next = {
    ...state,
    closing: { ...closing, writesOwed: closing.writesOwed - 1 },
  };

  if (next.closing.writesOwed > 0) return only(next);

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

  return only({ ...state, closing: { at: closing.at, writesOwed: 0 } });
}

/** The drafts a confirmed write updates: only the fields it stored. */
function draftsAfterWrite(
  draft: DesignDrafts,
  design: DesignFields,
  patch: UpdateDesignInput,
): DesignDrafts {
  const next = { ...draft };

  for (const field of DESIGN_TEXT_FIELDS) {
    if (field in patch) next[field] = design[field] ?? "";
  }

  for (const field of DESIGN_CHOICE_FIELDS) {
    if (field in patch) next[field] = design[field];
  }

  return next;
}

/** The row a confirmed write collapses: the one it stored, if it is still open. */
function collapsedRow(
  editing: EditDesignRow | null,
  patch: UpdateDesignInput,
): EditDesignRow | null {
  if (editing === null || editing === "taxonomy") return editing;

  return editing in patch ? null : editing;
}

/** Clears the refusal for the field that just changed, and only that field. */
function clearedError(
  error: EditDesignState["error"],
  field: DesignEditableField,
): EditDesignState["error"] {
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
 * them all — and `records`, which only a close sets. The changes ride together
 * in one effect; the number of writes the visit still owes is its bookkeeping.
 *
 * `next` still holds the Material use panel that was open, because its colour
 * is part of what the flush owes; the caller closes or replaces it on the
 * result.
 */
function flush(
  next: EditDesignState,
  now: number,
  { writesDrafts, records }: { writesDrafts: boolean; records: boolean },
): EditDesignResult {
  const changes: DesignChanges = {};
  const uses = unwrittenUseChanges(next);
  const fields = writesDrafts ? unwrittenFields(next) : null;

  if (uses.length > 0) changes.uses = uses;
  if (fields) changes.fields = fields;

  const owesWrite = changes.fields !== undefined || (changes.uses?.length ?? 0) > 0;
  const effects = owesWrite ? [writeEffect(next, changes, now)] : [];

  if (!records) return owesWrite ? { state: next, effects } : only(next);

  // A close arms the visit with the writes it just declared, so the Event waits
  // for the rows they store rather than the drafts that asked for them.
  const closed: EditDesignState = {
    ...next,
    closing: { at: now, writesOwed: effects.length },
  };

  if (owesWrite) return { state: closed, effects };

  const recorded = recordEffect(closed, now);

  return { state: closed, effects: recorded ? [recorded] : [] };
}

/**
 * The state after the owner leaves a row: a blank name falls back to the
 * stored one, and a refusal on the row being left clears. The caller decides
 * what opens next.
 */
function leftRow(state: EditDesignState, leaving: EditDesignRow | null): EditDesignState {
  const invalidName = leaving === "name" && designNameProblem(state.draft.name) !== null;

  return {
    ...state,
    draft: invalidName ? { ...state.draft, name: state.stored.name } : state.draft,
    error: state.error?.field === leaving ? null : state.error,
  };
}

export function editDesignReducer(
  state: EditDesignState,
  event: EditDesignEvent,
): EditDesignResult {
  switch (event.type) {
    case "design-loaded": {
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
    case "text-changed":
      return only({
        ...state,
        draft: { ...state.draft, [event.field]: event.value },
        error: clearedError(state.error, event.field),
      });
    case "text-row-left": {
      // Leaving a text row writes what it holds; whether that is a change is
      // the write's to decide, not the visit's.
      const next = leftRow(state, event.field);

      return {
        state: next,
        effects: [
          writeEffect(
            next,
            { fields: draftPatch(event.field, state.draft[event.field]) },
            event.now,
          ),
        ],
      };
    }
    case "choice-chosen": {
      const next = {
        ...state,
        draft: { ...state.draft, [event.field]: event.value },
        error: clearedError(state.error, event.field),
      };

      return {
        state: next,
        effects: [writeEffect(next, { fields: draftPatch(event.field, event.value) }, event.now)],
      };
    }
    case "material-use-add-confirmed": {
      const editor = addingMaterialUse(state);

      if (!editor || editor.materialId === null) {
        return only(state);
      }

      // The panel keeps the choices until the write reports back, so a refusal
      // can leave them on screen.
      return {
        state,
        effects: [
          writeEffect(
            state,
            {
              uses: [
                {
                  kind: "add",
                  input: {
                    materialId: editor.materialId,
                    colour: editor.colour,
                    role: editor.role,
                  },
                },
              ],
            },
            event.now,
          ),
        ],
      };
    }
    case "material-use-added":
      // The use is already written; the visit only keeps it for the Event it
      // records at close, so adding one does not end the visit.
      return only({
        ...state,
        materialUsePanel: null,
        storedUses: [...state.storedUses, event.materialUse],
      });
    case "material-use-add-refused":
      return withAddEditorFact(state, {
        type: "use-creation-refused",
        message: event.message,
      });
    case "material-use-add-opened": {
      // One editor at a time: a text row being left is written, and a Material
      // use editor being left writes the colour it still owes.
      const flushed = flush({ ...leftRow(state, state.editing), editing: null }, event.now, {
        writesDrafts: true,
        records: false,
      });

      return withPanel(flushed, {
        kind: "add",
        editor: createInitialAddMaterialUseState(),
      });
    }
    case "material-use-editor-opened": {
      const flushed = flush({ ...leftRow(state, state.editing), editing: null }, event.now, {
        writesDrafts: true,
        records: false,
      });
      return withPanel(flushed, {
        kind: "edit",
        ...editingMaterialUseFrom(event.materialUse),
      });
    }
    case "material-use-inline-fact":
      return withAddEditorFact(state, { type: "inline-fact", fact: event.fact });
    case "material-use-panel-fact": {
      const { fact } = event;
      const editing = editingMaterialUse(state);

      switch (fact.type) {
        case "closed":
          return withPanel({ state, effects: materialUseFlushEffects(state, event.now) }, null);
        case "colour-changed": {
          if (editing) {
            // A typed colour is a draft; leaving the field or the panel writes it.
            return only({
              ...state,
              materialUsePanel: { kind: "edit", ...editing, colour: fact.colour, error: null },
            });
          }

          const adding = addingMaterialUse(state);

          if (!adding) return only(state);

          return only(
            withAddEditor(
              state,
              addMaterialUseReducer(adding, { type: "colour-changed", colour: fact.colour }),
            ),
          );
        }
        case "colour-committed":
          return { state, effects: materialUseFlushEffects(state, event.now) };
        case "material-chosen": {
          if (editing) {
            if (fact.materialId === null) return only(state);

            const next = {
              ...state,
              materialUsePanel: {
                kind: "edit" as const,
                ...editing,
                materialId: fact.materialId,
                error: null,
              },
            };

            return { state: next, effects: materialUseFlushEffects(next, event.now) };
          }

          const adding = addingMaterialUse(state);

          if (!adding) return only(state);

          return only(
            withAddEditor(
              state,
              addMaterialUseReducer(adding, {
                type: "material-chosen",
                materialId: fact.materialId,
              }),
            ),
          );
        }
        case "role-chosen": {
          if (editing) {
            const next = {
              ...state,
              materialUsePanel: { kind: "edit" as const, ...editing, role: fact.role, error: null },
            };

            return { state: next, effects: materialUseFlushEffects(next, event.now) };
          }

          const adding = addingMaterialUse(state);

          if (!adding) return only(state);

          return only(
            withAddEditor(
              state,
              addMaterialUseReducer(adding, { type: "role-chosen", role: fact.role }),
            ),
          );
        }
        case "remove-pressed": {
          if (!editing) return only(state);

          return {
            state,
            effects: [
              writeEffect(
                state,
                { uses: [{ kind: "remove", useId: editing.stored.id }] },
                event.now,
              ),
            ],
          };
        }
        case "saved": {
          const isTheSameUse = editing !== null && editing.stored.id === fact.materialUse.id;

          return only({
            ...state,
            // A late outcome for a use the editor has moved on from updates the
            // row, not the open editor.
            materialUsePanel:
              editing && isTheSameUse
                ? {
                    kind: "edit" as const,
                    materialId: fact.materialUse.materialId,
                    colour: fact.materialUse.colour,
                    role: fact.materialUse.role,
                    stored: fact.materialUse,
                    error: null,
                  }
                : state.materialUsePanel,
            // The correction is already written; the visit keeps what its own write
            // stored, so a use added and then corrected still reads as one addition.
            storedUses: state.storedUses.map((use) =>
              use.id === fact.materialUse.id ? fact.materialUse : use,
            ),
          });
        }
        case "refused": {
          if (!editing || editing.stored.id !== fact.useId) return only(state);

          return only({
            ...state,
            materialUsePanel: {
              kind: "edit",
              materialId: editing.stored.materialId,
              colour: editing.stored.colour,
              role: editing.stored.role,
              stored: editing.stored,
              error: fact.message,
            },
          });
        }
        case "use-missing":
          // The use is no longer stored, so there is nothing left to correct or
          // remove. Only the row's own disappearance ends the visit.
          return only({
            ...state,
            materialUsePanel: editing?.stored.id === fact.useId ? null : state.materialUsePanel,
            storedUses: state.storedUses.filter((use) => use.id !== fact.useId),
          });
        case "use-removed":
          return only({
            ...state,
            materialUsePanel: null,
            storedUses: state.storedUses.filter((use) => use.id !== fact.useId),
          });
      }
    }
    case "row-opened": {
      const leaving = state.editing;
      const leavingTextRow =
        leaving !== null &&
        leaving !== event.row &&
        leaving !== "taxonomy" &&
        !isChoiceField(leaving);

      // A row unmounted on iOS does not reliably fire blur, so opening another
      // row writes the one being left. Only a text row owes a draft; the visit
      // still records one Event.
      const flushed = flush({ ...leftRow(state, leaving), editing: event.row }, event.now, {
        writesDrafts: leavingTextRow,
        records: false,
      });

      return withPanel(flushed, null);
    }
    case "tab-changed": {
      if (event.tab === state.tab) return only(state);

      // A tab is unmounted on iOS without firing blur, so the tab change
      // writes the draft it holds, plus any Material use editor it closes. It
      // records nothing: the visit is still open.
      const flushed = flush(
        { ...leftRow(state, state.editing), tab: event.tab, editing: null },
        event.now,
        { writesDrafts: true, records: false },
      );

      return withPanel(flushed, null);
    }
    case "row-closed":
      return only({ ...state, editing: null });
    case "drafts-written":
      // The row the write stored becomes the visit's record, and the drafts it
      // wrote follow it so a trimmed name shows as it was stored. The write is
      // not settled by its own outcome events; `write-settled` does that.
      return only({
        ...state,
        draft: draftsAfterWrite(state.draft, event.design, event.patch),
        stored: event.design,
        editing: collapsedRow(state.editing, event.patch),
        error: state.error && state.error.field in event.patch ? null : state.error,
      });
    case "field-refused":
      // Only the field the write refused is restored; the drafts beside it stay
      // as the owner left them, still unwritten.
      return only({
        ...state,
        draft: {
          ...state.draft,
          [event.field]: isChoiceField(event.field)
            ? state.stored[event.field]
            : (state.stored[event.field] ?? ""),
        },
        error: { field: event.field, message: event.message },
      });
    case "design-missing":
      // A late outcome can belong to a surface that has moved on; only this
      // visit's own row being gone ends it.
      if (event.designId !== state.designId) return only(state);

      return settledWithoutRow(state);
    case "write-settled":
      // One write reports back, whether it stored, refused, or missed a use.
      // Only this event decrements the close's debt and records the visit.
      if (event.designId !== state.designId) return only(state);

      return settled(state);
    case "app-backgrounded":
      // Leaving the foreground flushes a draft; only a close records the visit.
      return state.closing
        ? only(state)
        : flush(state, event.now, { writesDrafts: true, records: false });
    case "visit-closed": {
      if (state.closing) return only(state);

      const flushed = flush(state, event.now, { writesDrafts: true, records: true });

      return withPanel(flushed, null);
    }
  }
}
