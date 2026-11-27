import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Keyboard, Pressable, ScrollView, View } from "react-native";
import { Sheet, SheetBody } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";

/** One option row, the clear row included; only the chosen one carries the check. */
type Entry = {
  key: string;
  label: string;
  chosen: boolean;
  /** The clear row reads in Faded Thread: it names an absence, not a record. */
  quiet: boolean;
  onPress: () => void;
};

/**
 * A picker drawn as its own sheet above the sheet it sits on: Edit's Category,
 * Collection, and Material choices. The trigger is the select's shell — Warm
 * Paper, Thread Line stroke, the field radius and height, a Faded Thread
 * chevron — and the options open on the shared wrapper, one tone deeper than the
 * sheet beneath, so the stack reads without a second popover.
 *
 * Opening dismisses the keyboard first. A Material picker sits beside a Colour
 * field that may already hold the keys, and a sheet that slides up under them
 * would push its own list off the card.
 *
 * It keeps only whether it is open: a choice is reported as the field's fact,
 * which the surface's reducer owns, and this control decides nothing. The create
 * form keeps the popover select because it is a modal route, and a sheet opened
 * from inside one cannot climb above it.
 */
export function ChoiceSheet<T extends { id: string; name: string }>({
  label,
  placeholder,
  value,
  items,
  disabled,
  clearable = true,
  itemLabel = (item) => item.name,
  onSelect,
}: {
  /** The field's name: the trigger's label and the sheet's title. */
  label: string;
  placeholder: string;
  value: T | null;
  items: T[];
  disabled: boolean;
  /** Whether the picker offers the row that clears the choice. */
  clearable?: boolean;
  itemLabel?: (item: T) => string;
  onSelect: (item: T | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const valueLabel = value ? itemLabel(value) : placeholder;
  const entries: Entry[] = items.map((item) => ({
    key: item.id,
    label: itemLabel(item),
    chosen: value?.id === item.id,
    quiet: false,
    onPress: () => choose(item),
  }));

  if (clearable) {
    entries.push({
      key: "__none__",
      label: placeholder,
      chosen: value === null,
      quiet: true,
      onPress: () => choose(null),
    });
  }

  function openSheet(): void {
    Keyboard.dismiss();
    setOpen(true);
  }

  function close(): void {
    setOpen(false);
  }

  function choose(item: T | null): void {
    setOpen(false);
    onSelect(item);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: valueLabel }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openSheet}
        className={cn(
          "border-input bg-background flex h-10 w-full flex-row items-center justify-between gap-2 rounded-md border px-3 py-1 shadow-sm shadow-black/5",
          disabled && "opacity-50",
        )}
      >
        <Text
          numberOfLines={1}
          className={cn(
            "flex-1 text-base leading-5",
            value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {valueLabel}
        </Text>
        <Icon as={ChevronDown} aria-hidden className="text-muted-foreground size-4" />
      </Pressable>

      <Sheet open={open} onClose={close}>
        {open ? (
          <SheetBody testID="choice-sheet">
            <SheetHeader
              title={`${label} (${items.length})`}
              closeLabel={`Close ${label.toLowerCase()}`}
              onClose={close}
            />

            {/* Only the options scroll: the title and its X stay put, so a long
                list never carries the way out of the sheet off the top. The
                title counts the entries, so a list clipped at the plate edge
                still says how much sits below it. */}
            <ScrollView accessibilityLabel={label} keyboardShouldPersistTaps="handled">
              <View className="border-border overflow-hidden rounded-xl border">
                {entries.map((entry, index) => (
                  <Pressable
                    key={entry.key}
                    accessibilityRole="button"
                    accessibilityLabel={entry.label}
                    accessibilityState={{ selected: entry.chosen }}
                    onPress={entry.onPress}
                    className={cn(
                      "active:bg-accent flex min-h-11 flex-row items-center justify-between gap-3 px-4 py-3",
                      index > 0 && "border-border border-t",
                    )}
                  >
                    <Text
                      numberOfLines={2}
                      className={cn(
                        "flex-1",
                        entry.quiet ? "text-muted-foreground" : entry.chosen && "font-medium",
                      )}
                    >
                      {entry.label}
                    </Text>
                    <View className="w-4 items-center">
                      {entry.chosen ? <Icon as={Check} className="text-foreground size-4" /> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </SheetBody>
        ) : null}
      </Sheet>
    </>
  );
}
