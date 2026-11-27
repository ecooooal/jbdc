import { Check } from "lucide-react-native";
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
 * The Statuses the status sheet offers, in lifecycle order. Archived is absent
 * until the filters slice gives it a home, because a design moved there would
 * have no way back through this sheet.
 */
const OFFERED_STATUSES = DESIGN_STATUSES.filter((status) => status !== "archived");

/**
 * The status sheet: the five offered Statuses in lifecycle order, the current
 * one checked, on the shared sheet wrapper. A press sends the row the owner
 * chose; the surface reducer decides what it means — a non-rejected move
 * closes the sheet and writes at once, the checked row closes with no write,
 * and Rejected expands the shared decision fields beneath the list with
 * `Reject design`, which writes one Event carrying the move and the why. The
 * five rows stay put while the form is open, and the current check stays with
 * them, so a mis-tap is not a one-way trip. Every dismiss reports through the
 * one close fact, and a Design's status writes nothing for that.
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
            {OFFERED_STATUSES.map((status, index) => {
              const checked = status === sheet.current;
              // Rejected is the one row that expands a form instead of writing
              // at once. Its row keeps the Kraft tint while the form below is
              // open, so the fields have a visible owner in the list.
              const rejectionOpen = status === "rejected" && rejection !== null;

              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityLabel={designStatusLabel(status)}
                  accessibilityState={{
                    selected: checked,
                    ...(status === "rejected" && !checked ? { expanded: rejectionOpen } : {}),
                  }}
                  onPress={() => send({ type: "status-row-pressed", status })}
                  className={cn(
                    "active:bg-accent flex min-h-11 flex-row items-center justify-between gap-3 px-4 py-3",
                    index > 0 && "border-border border-t",
                    rejectionOpen && "bg-accent",
                  )}
                >
                  <Text className={cn("flex-1", (checked || rejectionOpen) && "font-medium")}>
                    {designStatusLabel(status)}
                  </Text>
                  <View className="w-4 items-center">
                    {checked ? <Icon as={Check} className="text-foreground size-4" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Rejected is the last offered row, so the fields open directly
              beneath the list rather than replacing it. */}
          {rejection ? (
            <>
              <DecisionFields
                value={rejection}
                onChange={(field, value) => send({ type: "rejection-field-changed", field, value })}
              />

              <SheetFooter>
                <Button hitSlop={4} onPress={() => send({ type: "reject-pressed" })}>
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
