import type { ReactNode } from "react";
import { ChoiceSheet } from "./choice-sheet";
import { FormField } from "./form-field";

/**
 * One Taxonomy list as a form reads it: the field's name, the picker's shell,
 * and whatever the surface places beneath it — Edit's refusal, or the create
 * form's "New category" action. Both screens compose their Category and
 * Collection this way, so a list is picked identically whether the owner is
 * creating a Design or editing one.
 */
export function TaxonomyField<T extends { id: string; name: string }>({
  label,
  placeholder,
  value,
  items,
  disabled,
  itemLabel,
  error,
  children,
  onSelect,
}: {
  /** The field's name: the trigger's label and the choice sheet's title. */
  label: string;
  placeholder: string;
  value: T | null;
  items: T[];
  disabled: boolean;
  itemLabel?: (item: T) => string;
  /** The surface's refusal for this field, when it has one. */
  error?: ReactNode;
  /** The surface's own action beneath the picker, such as "New category". */
  children?: ReactNode;
  onSelect: (item: T | null) => void;
}) {
  return (
    <FormField label={label}>
      <ChoiceSheet
        label={label}
        placeholder={placeholder}
        value={value}
        items={items}
        disabled={disabled}
        itemLabel={itemLabel}
        onSelect={onSelect}
      />
      {children}
      {error}
    </FormField>
  );
}
