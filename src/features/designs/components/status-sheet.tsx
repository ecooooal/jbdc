import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Sheet, SheetBody } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { DESIGN_STATUSES } from "@/features/database";
import { cn } from "@/shared/lib/utils";
import type { DesignDetailEvent, StatusSheetState } from "../lib/design-detail-reducer";
import { designStatusLabel } from "../lib/status";

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
 * and Rejected expands its why form. Every dismiss reports through the one
 * close fact, and a Design's status writes nothing for that.
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

  return (
    <Sheet open={sheet !== null} onClose={dismiss}>
      {sheet ? (
        <SheetBody testID="status-sheet">
          <SheetHeader title="Status" closeLabel="Close status" onClose={dismiss} />

          <View className="border-border overflow-hidden rounded-xl border">
            {OFFERED_STATUSES.map((status, index) => {
              const checked = status === sheet.current;

              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityLabel={designStatusLabel(status)}
                  accessibilityState={{ selected: checked }}
                  onPress={() => send({ type: "status-row-pressed", status })}
                  className={cn(
                    "active:bg-accent flex min-h-11 flex-row items-center justify-between gap-3 px-4 py-3",
                    index > 0 && "border-border border-t",
                  )}
                >
                  <Text className={cn("flex-1", checked && "font-medium")}>
                    {designStatusLabel(status)}
                  </Text>
                  <View className="w-4 items-center">
                    {checked ? <Icon as={Check} className="text-foreground size-4" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SheetBody>
      ) : null}
    </Sheet>
  );
}
