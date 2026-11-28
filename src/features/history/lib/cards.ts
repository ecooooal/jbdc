import type { DesignEventKind } from "@/features/database";
import { designFieldLabel, designStatusLabel, type DesignEditableField } from "@/features/designs";
import { taxonomyLabel, type TaxonomyNames } from "@/features/taxonomy";
import {
  materialUseLines,
  type DesignEditDiff,
  type DesignEvent,
  type RecordedImage,
  type StatusMove,
} from "./events";
import type { HistoryLine } from "./lines";
import {
  DESIGN_HISTORY_SECTIONS,
  HISTORY_IMAGES_SECTION,
  type DesignHistorySection,
} from "./sections";

/** The Event kinds whose card is one section of its own, keyed by the kind. */
type EventCardKind = Extract<DesignEventKind, "status_change" | "decision" | "note">;

/** One labelled group of lines on a card, in reading order. */
export type DesignHistoryCardSection = {
  section: DesignHistorySection | EventCardKind;
  label: string;
  lines: HistoryLine[];
};

/** The full content of one History card: its sections in reading order. */
export type DesignHistoryCard = {
  sections: DesignHistoryCardSection[];
};

/** One rule turns an Event into the sections it would render, before empties are dropped. */
type Rule = (event: DesignEvent, taxonomy: TaxonomyNames) => DesignHistoryCardSection[];

/**
 * The value a History entry shows for a field. A Category or Collection is
 * stored as its id, so the owner reads the name instead; null is the field
 * being empty. A Taxonomy entry deleted since the edit still has a name (#7).
 */
function valueLabel(
  field: DesignEditableField,
  value: string | null,
  { categories, collections }: TaxonomyNames,
): string {
  if (value === null) return "None";

  switch (field) {
    case "categoryId":
      return categories.get(value) ?? "Unknown Category";
    case "collectionId": {
      const collection = collections.get(value);

      return collection ? taxonomyLabel(collection) : "Unknown Collection";
    }
    default:
      return value;
  }
}

/** One section's field lines, in the order the section declares its fields. */
function fieldLines(
  diff: DesignEditDiff,
  fields: readonly DesignEditableField[],
  taxonomy: TaxonomyNames,
): HistoryLine[] {
  const lines: HistoryLine[] = [];

  for (const field of fields) {
    const change = diff[field];

    if (change) {
      lines.push({
        key: field,
        text: `${designFieldLabel(field)}: ${valueLabel(field, change.from, taxonomy)} → ${valueLabel(field, change.to, taxonomy)}`,
      });
    }
  }

  return lines;
}

/**
 * The visit rule: field changes grouped by the module's section list, with
 * Material use lines under Materials. The wording, order and name resolution
 * live here beside the diff the screen reads.
 */
const editRule: Rule = (event, taxonomy) => {
  const diff = event.diff ?? {};
  const useLines = materialUseLines(diff.materials);

  return DESIGN_HISTORY_SECTIONS.map((definition) => ({
    section: definition.section,
    label: definition.label,
    lines:
      definition.section === "materials" ? useLines : fieldLines(diff, definition.fields, taxonomy),
  }));
};

/** One attach line: one count per kind in first-appearance order, joined as work. */
function attachLine(attached: RecordedImage[]): HistoryLine {
  const counts = new Map<string, number>();

  for (const image of attached) counts.set(image.kind, (counts.get(image.kind) ?? 0) + 1);

  const counted = [...counts].map(
    ([kind, count]) => `${count} ${kind} image${count === 1 ? "" : "s"}`,
  );

  return { key: "attached", text: `${counted.join(", ")} attached` };
}

/**
 * The image rule: one attach action is one line of work; each removal and each
 * reclassification is its own line. Kind words are the Event's own diff values,
 * lowercase as the glossary writes them — no import from the images package.
 */
const imageRule: Rule = (event) => {
  const changes = event.diff?.images;
  const lines: HistoryLine[] = [];

  if (changes) {
    if ((changes.attached?.length ?? 0) > 0) lines.push(attachLine(changes.attached ?? []));

    for (const image of changes.removed ?? []) {
      lines.push({ key: `removed:${image.id}`, text: `${image.kind} image removed` });
    }

    for (const { from, to } of changes.reclassified ?? []) {
      lines.push({
        key: `reclassified:${from.id}`,
        text: `${from.kind} image reclassified to ${to.kind}`,
      });
    }
  }

  return [
    {
      section: HISTORY_IMAGES_SECTION.section,
      label: HISTORY_IMAGES_SECTION.label,
      lines,
    },
  ];
};

/**
 * A Status move as the owner reads it: the two labels through the designs
 * package's one label rule, old value first.
 */
function statusMoveLine(move: StatusMove): HistoryLine {
  return {
    key: "status",
    text: `${designStatusLabel(move.from)} → ${designStatusLabel(move.to)}`,
  };
}

/**
 * The status_change rule: the move is the whole card, one line under `Status
 * change`. A move written without its diff has nothing honest to say.
 */
const statusChangeRule: Rule = (event) => {
  const move = event.diff?.status;

  return [
    {
      section: "status_change",
      label: "Status change",
      lines: move ? [statusMoveLine(move)] : [],
    },
  ];
};

/**
 * The decision rule: a rejection carries its move, reason, and potential
 * improvements in one card; a later decision carries only its why. Every line
 * is optional, so a blank decision is no card at all.
 */
const decisionRule: Rule = (event) => {
  const lines: HistoryLine[] = [];
  const move = event.diff?.status;

  if (move) lines.push(statusMoveLine(move));
  if (event.reason) lines.push({ key: "reason", text: `Reason: ${event.reason}` });
  if (event.potentialImprovements) {
    lines.push({
      key: "potentialImprovements",
      text: `Potential improvements: ${event.potentialImprovements}`,
    });
  }

  return [{ section: "decision", label: "Decision", lines }];
};

/**
 * The note card: its free text under `Note`. No note writer exists yet, so
 * this is the one honest placeholder left.
 */
const noteRule: Rule = (event) => [
  {
    section: "note",
    label: "Note",
    lines: event.reason ? [{ key: "reason", text: event.reason }] : [],
  },
];

/**
 * Every kind the schema names has a rule, keyed by kind: adding a sixth kind
 * fails the typecheck until its History wording is decided here.
 */
const RULES: Record<DesignEventKind, Rule> = {
  status_change: statusChangeRule,
  decision: decisionRule,
  edit: editRule,
  note: noteRule,
  image_change: imageRule,
};

/**
 * The one Event→card derivation: an Event and the taxonomy's name maps become
 * the card's full content. Sections are in reading order with empty ones
 * dropped; an Event with nothing to say is no card at all. Pure — no React, no
 * database, no visit state (ADR-0004).
 */
export function designEventCard(
  event: DesignEvent,
  taxonomy: TaxonomyNames,
): DesignHistoryCard | null {
  const sections = RULES[event.kind](event, taxonomy).filter(({ lines }) => lines.length > 0);

  return sections.length === 0 ? null : { sections };
}
