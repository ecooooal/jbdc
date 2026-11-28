import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Sheet, SheetBody, SheetFooter } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { DESIGN_STATUSES } from "@/features/database";
import { cn } from "@/shared/lib/utils";
import type { DesignDetailEvent, StatusSheetState } from "../lib/design-detail-reducer";
import { designStatusLabel } from "../lib/status";
import { DecisionFields } from "./decision-fields";

/**
 * The Statuses that carry a Design onward, in lifecycle order. Rejected is the
 * one ending, drawn apart below them; Archived is absent until the filters
 * slice gives it a home, because a design moved there would have no way back
 * through this sheet.
 */
const ONWARD_STATUSES = DESIGN_STATUSES.filter(
  (status) => status !== "rejected" && status !== "archived",
);

/**
 * One row of the sheet's hairline lists. Each row is the whole 44dp target, and
 * the chosen one takes the same Deep Wood fill the choice sheets give their
 * chosen option, with Unbleached Paper ink.
 */
const ROW = "flex min-h-11 flex-row items-center justify-between gap-3 px-4 py-3";
const CHOSEN_ROW = "bg-selection active:bg-selection/90";

/**
 * The status sheet: the four Statuses that carry a Design onward in one list,
 * the current one checked and filled, on the shared sheet wrapper. Rejected
 * ends the Design rather than moving it on, so it sits a full section below
 * that list in a box of its own — a press meant for Produced cannot land on
 * the one Status that ends the Design. Its row carries a chevron rather than
 * acting at once: it expands the shared decision fields with `Reject design`,
 * which writes one Event carrying the move and the why. The rows stay put
 * while the form is open, and the current check stays with them, so a mis-tap
 * is not a one-way trip. Every dismiss reports through the one close fact, and
 * a Design's status writes nothing for that.
 *
 * Color stays state: Deep Wood is the Design's current Status, and Rejection
 * Red is the one action that ends it.
 */
export function StatusSheet({
  sheet,
  send,
}: {
  sheet: StatusSheetState | null;
  send: (event: DesignDetailEvent) => void;
}) {
  function dismiss(): void {
    send({ type: "status-sheet-closed" });
  }

  const rejection = sheet?.rejection ?? null;

  return (
    <Sheet open={sheet !== null} onClose={dismiss}>
      {sheet ? (
        <SheetBody testID="status-sheet" scroll>
          <SheetHeader title="Status" closeLabel="Close status" onClose={dismiss} />

          <View className="border-border overflow-hidden rounded-xl border">
            {ONWARD_STATUSES.map((status, index) => {
              const checked = status === sheet.current;

              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityLabel={designStatusLabel(status)}
                  accessibilityState={{ selected: checked }}
                  onPress={() => send({ type: "status-row-pressed", status })}
                  className={cn(
                    ROW,
                    index > 0 && "border-border border-t",
                    checked ? CHOSEN_ROW : "active:bg-accent",
                  )}
                >
                  <Text
                    className={cn("flex-1", checked && "text-selection-foreground font-medium")}
                  >
                    {designStatusLabel(status)}
                  </Text>
                  <View className="w-4 items-center">
                    {checked ? (
                      <Icon as={Check} className="text-selection-foreground size-4" />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Rejected keeps its own box a section below the list, with the
              chevron saying it opens a form rather than writing at once. While
              that form is open the row keeps the Kraft tint, so the fields
              below have a visible owner. */}
          <View className="border-border mt-2 overflow-hidden rounded-xl border">
            <RejectedRow
              checked={sheet.current === "rejected"}
              expanded={rejection !== null}
              onPress={() => send({ type: "status-row-pressed", status: "rejected" })}
            />
          </View>

          {rejection ? (
            <>
              <DecisionFields
                value={rejection}
                onChange={(field, value) => send({ type: "rejection-field-changed", field, value })}
              />

              <SheetFooter>
                <Button
                  variant="destructive"
                  hitSlop={4}
                  onPress={() => send({ type: "reject-pressed" })}
                >
                  <Text>Reject design</Text>
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetBody>
      ) : null}
    </Sheet>
  );
}

/**
 * The one row in its own box: Rejected, the Status that ends the Design. It
 * shows a chevron because it discloses the why fields instead of writing on the
 * press; open, the chevron turns up and the row takes the Kraft tint so the
 * fields below are visibly its own. A Design already Rejected shows the same
 * check as the list, because pressing it writes nothing.
 */
function RejectedRow({
  checked,
  expanded,
  onPress,
}: {
  checked: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={designStatusLabel("rejected")}
      accessibilityState={{ selected: checked, ...(!checked ? { expanded } : {}) }}
      onPress={onPress}
      className={cn(
        ROW,
        checked ? CHOSEN_ROW : "active:bg-accent",
        expanded && !checked && "bg-accent",
      )}
    >
      <Text
        className={cn(
          "flex-1",
          (checked || expanded) && "font-medium",
          checked && "text-selection-foreground",
        )}
      >
        {designStatusLabel("rejected")}
      </Text>
      <View className="w-4 items-center">
        {checked ? (
          <Icon as={Check} className="text-selection-foreground size-4" />
        ) : expanded ? (
          <Icon as={ChevronUp} aria-hidden className="text-muted-foreground size-4" />
        ) : (
          <Icon as={ChevronDown} aria-hidden className="text-muted-foreground size-4" />
        )}
      </View>
    </Pressable>
  );
}
