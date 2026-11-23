import { GROUPINGS, type Grouping } from "@/features/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/** The two grouping choices, written as the Owner reads them. */
const GROUPING_LABELS: Record<Grouping, string> = {
  "per-design": "Per design",
  "per-collection": "Per collection",
};

/**
 * The Library's grouping choice, in the header corner where the screen title
 * used to sit. The trigger shows the current grouping and opens the two
 * choices beneath it; picking one hands the choice to the hook, which persists
 * it.
 */
export function GroupingSelect({
  grouping,
  onChange,
}: {
  grouping: Grouping;
  onChange: (grouping: Grouping) => void;
}) {
  return (
    <Select
      value={{ value: grouping, label: GROUPING_LABELS[grouping] }}
      onValueChange={(option) => {
        const next = GROUPINGS.find((choice) => choice === option?.value);

        if (next) onChange(next);
      }}
    >
      <SelectTrigger accessibilityLabel="Grouping">
        <SelectValue placeholder={GROUPING_LABELS[grouping]} />
      </SelectTrigger>
      <SelectContent>
        {GROUPINGS.map((option) => (
          <SelectItem key={option} value={option} label={GROUPING_LABELS[option]} />
        ))}
      </SelectContent>
    </Select>
  );
}
