import { Sheet, SheetBody, SheetFooter } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Button } from "@/shared/components/ui/button";
import { Text } from "@/shared/components/ui/text";
import {
  canSaveDecision,
  type DecisionDraft,
  type DesignDetailEvent,
} from "../lib/design-detail-reducer";
import { DecisionFields } from "./decision-fields";

/**
 * The later-decision sheet: Add a decision opens it over the shared wrapper,
 * prefilled from the latest decision — empty when the Design has none — with
 * the same Reason and Potential improvements the rejection form uses. Save
 * decision is disabled while both trimmed fields are empty; saving closes the
 * sheet and declares one `decision` Event with no Status diff, and the block
 * updates through the live read. Every dismiss drops the draft and writes
 * nothing.
 */
export function DecisionSheet({
  draft,
  send,
}: {
  draft: DecisionDraft | null;
  send: (event: DesignDetailEvent) => void;
}) {
  function dismiss(): void {
    send({ type: "decision-sheet-closed" });
  }

  return (
    <Sheet open={draft !== null} onClose={dismiss}>
      {draft ? (
        <SheetBody testID="decision-sheet" scroll>
          <SheetHeader title="Add a decision" closeLabel="Close decision" onClose={dismiss} />

          <DecisionFields
            value={draft}
            onChange={(field, value) => send({ type: "decision-field-changed", field, value })}
          />

          <SheetFooter>
            <Button
              disabled={!canSaveDecision(draft)}
              hitSlop={4}
              onPress={() => send({ type: "save-decision-pressed" })}
            >
              <Text>Save decision</Text>
            </Button>
          </SheetFooter>
        </SheetBody>
      ) : null}
    </Sheet>
  );
}
