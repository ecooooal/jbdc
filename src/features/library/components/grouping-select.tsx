import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { GROUPINGS, type Grouping } from "@/features/settings";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";

/** The two grouping choices, written as the Owner reads them. */
const GROUPING_LABELS: Record<Grouping, string> = {
  "per-design": "Per design",
  "per-collection": "Per collection",
};

/**
 * The Library's grouping choice, in the header corner where the screen title
 * used to sit. The trigger shows the current grouping and opens the two
 * choices beneath it; picking one closes the list and hands the choice to the
 * hook, which persists it. A plain press menu rather than the native Select,
 * whose portal cannot open outside a device.
 */
export function GroupingSelect({
  grouping,
  onChange,
}: {
  grouping: Grouping;
  onChange: (grouping: Grouping) => void;
}) {
  const [open, setOpen] = useState(false);

  const choose = (next: Grouping) => {
    setOpen(false);

    if (next !== grouping) onChange(next);
  };

  return (
    <View className="z-50">
      <Pressable
        role="combobox"
        accessibilityLabel="Grouping"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={() => setOpen((current) => !current)}
        className="flex-row items-center gap-1"
      >
        <Text className="text-base font-medium">{GROUPING_LABELS[grouping]}</Text>
        <Icon as={ChevronDown} className="text-muted-foreground size-4" />
      </Pressable>

      {open ? (
        <View
          role="list"
          className="bg-popover border-border absolute left-0 top-full z-50 mt-1 min-w-44 rounded-md border p-1"
        >
          {GROUPINGS.map((option) => (
            <Pressable
              key={option}
              role="option"
              accessibilityState={{ selected: option === grouping }}
              onPress={() => choose(option)}
              className="active:bg-accent flex-row items-center justify-between gap-2 rounded-sm px-2 py-2"
            >
              <Text className="text-sm">{GROUPING_LABELS[option]}</Text>
              {option === grouping ? (
                <Icon as={Check} className="text-muted-foreground size-4" />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
