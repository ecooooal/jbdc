import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/** A Select option value no Category or Collection id can collide with. */
const NO_TAXONOMY = "__none__";

/**
 * A picker over the owner's live Categories or Collections, plus the row that
 * clears the choice. The options and the current label come from that list, so
 * an entry created inline appears as soon as the insert is observed. The create
 * form and Edit both pick through this one control.
 */
export function TaxonomySelect<T extends { id: string; name: string }>({
  label,
  placeholder,
  value,
  items,
  disabled,
  clearable = true,
  itemLabel = (item) => item.name,
  onSelect,
}: {
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
  return (
    <Select
      disabled={disabled}
      value={value ? { value: value.id, label: itemLabel(value) } : undefined}
      onValueChange={(option) => onSelect(items.find((item) => item.id === option?.value) ?? null)}
    >
      <SelectTrigger accessibilityLabel={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id} label={itemLabel(item)} />
        ))}
        {clearable ? (
          <>
            <SelectSeparator />
            <SelectItem value={NO_TAXONOMY} label={placeholder} />
          </>
        ) : null}
      </SelectContent>
    </Select>
  );
}
