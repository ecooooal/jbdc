import { eq } from "drizzle-orm";
import type { Database, DatabaseHandle, DesignEventKind, DesignStatus } from "@/features/database";
import { designEvents, designs } from "@/features/database";
import { normalizeOptionalText } from "./optional-text";
import { designFrom, type Design } from "./records";

/** The why a rejection or a later decision records. Blank text is stored as null. */
export type DecisionFields = {
  reason: string | null;
  potentialImprovements: string | null;
};

/**
 * What the owner chose for a Design's Status. A rejection carries its why and
 * nothing else can: the type forbids a Status move with a reason, and a
 * rejection without its two fields.
 */
export type StatusChange =
  ({ status: "rejected" } & DecisionFields) | { status: Exclude<DesignStatus, "rejected"> };

/**
 * What one Status or later-decision write produced: the row as it now stands,
 * whether or not anything changed, or nothing because the Design row is no
 * longer in the catalog.
 */
export type StatusWriteResult = { kind: "stored"; design: Design } | { kind: "design-missing" };

/** One Status Event row as this write path stores it. */
type StoredStatusEvent = {
  id: string;
  designId: string;
  kind: Extract<DesignEventKind, "status_change" | "decision">;
  reason: string | null;
  potentialImprovements: string | null;
  diff: { status: { from: DesignStatus; to: DesignStatus } } | null;
  createdAt: number;
};

/**
 * Appends one Status Event inside the caller's transaction. The diff carries
 * the move for History; the why rides in its own columns, so a Decision reads
 * without parsing JSON.
 */
function appendStatusEvent(tx: DatabaseHandle, event: StoredStatusEvent): void {
  tx.insert(designEvents)
    .values({ ...event, diff: event.diff === null ? null : JSON.stringify(event.diff) })
    .run();
}

/**
 * Moves a Design's Status in any direction and records what the move did.
 * Entering Rejected writes one `decision` Event carrying the move and the why;
 * every other move writes one `status_change` with no reason. A move to the
 * Status the Design already has writes nothing. The row, its moved
 * `updatedAt`, and the Event land in one transaction; a missing Design answers
 * `design-missing` and writes nothing.
 */
export function changeStatus(
  database: Database,
  designId: string,
  change: StatusChange,
  now: number = Date.now(),
): StatusWriteResult {
  return database.transaction((tx) => {
    const current = designFrom(tx, designId);

    if (!current) return { kind: "design-missing" };
    if (current.status === change.status) return { kind: "stored", design: current };

    const rejection = change.status === "rejected" ? change : null;

    tx.update(designs)
      .set({ status: change.status, updatedAt: now })
      .where(eq(designs.id, designId))
      .run();
    appendStatusEvent(tx, {
      id: database.newId(),
      designId,
      kind: rejection ? "decision" : "status_change",
      reason: rejection ? normalizeOptionalText(rejection.reason) : null,
      potentialImprovements: rejection
        ? normalizeOptionalText(rejection.potentialImprovements)
        : null,
      diff: { status: { from: current.status, to: change.status } },
      createdAt: now,
    });

    return { kind: "stored", design: { ...current, status: change.status, updatedAt: now } };
  });
}
