import { View } from "react-native";
import { GROUPINGS, type Grouping } from "@/features/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Text } from "@/shared/components/ui/text";

/** The two grouping choices, written as the Owner reads them. */
const GROUPING_LABELS: Record<Grouping, string> = {
  "per-design": "Design",
  "per-collection": "Collection",
};

/**
 * The Library's grouping choice, under its own label so the control reads as
 * grouping rather than as a filter. The trigger shows the choice and opens the
 * two beneath it; picking one hands the choice to the hook, which persists it.
 * The trigger keeps the platform's 48 dp touch height while the type stays the
 * header's own size.
 */
export function GroupingSelect({
  grouping,
  onChange,
}: {
  grouping: Grouping;
  onChange: (grouping: Grouping) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-muted-foreground text-xs font-medium">Group by</Text>
      <Select
        value={{ value: grouping, label: GROUPING_LABELS[grouping] }}
        onValueChange={(option) => {
          const next = GROUPINGS.find((choice) => choice === option?.value);

          if (next) onChange(next);
        }}
      >
        <SelectTrigger
          accessibilityLabel="Group by"
          accessibilityValue={{ text: GROUPING_LABELS[grouping] }}
          className="h-auto min-h-12 sm:h-auto"
        >
          <SelectValue placeholder={GROUPING_LABELS[grouping]} />
        </SelectTrigger>
        <SelectContent>
          {GROUPINGS.map((option) => (
            <SelectItem key={option} value={option} label={GROUPING_LABELS[option]} />
          ))}
        </SelectContent>
      </Select>
    </View>
  );
}
