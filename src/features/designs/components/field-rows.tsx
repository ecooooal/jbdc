import { useRef } from "react";
import { Pressable, View, type TextInputInstance } from "react-native";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { EditDesignState } from "../lib/edit-design-reducer";
import type { DesignSectionField, DesignSectionFieldDefinition } from "../lib/sections";
import { FieldError } from "./field-error";
import { RowPencil } from "./row-pencil";

/**
 * One section's read-first rows: a line of `Label … value` until the owner
 * taps it; then the same row becomes its editor, one row at a time. A value
 * the owner has not recorded reads `Not set` in muted text.
 *
 * Each row keeps its Input mounted while it reads, hidden but focusable, so a
 * press can move focus to the next field before the previous editor unmounts.
 * That is what keeps the keyboard up when the owner hops between rows.
 */
export function FieldRows({
  fields,
  draft,
  editing,
  error,
  onOpen,
  onChange,
  onCommit,
}: {
  fields: readonly DesignSectionFieldDefinition[];
  draft: EditDesignState["draft"];
  editing: EditDesignState["editing"];
  error: EditDesignState["error"];
  onOpen: (field: DesignSectionField) => void;
  onChange: (field: DesignSectionField, value: string) => void;
  onCommit: (field: DesignSectionField) => void;
}) {
  return (
    <View className="border-border bg-background overflow-hidden rounded-xl border">
      {fields.map((field) => (
        <FieldRow
          key={field.field}
          definition={field}
          value={draft[field.field]}
          editing={editing === field.field}
          error={error?.field === field.field ? error.message : null}
          onOpen={onOpen}
          onChange={onChange}
          onCommit={onCommit}
        />
      ))}
    </View>
  );
}

/** One section row, its editor mounted through both states so focus can move first. */
function FieldRow({
  definition: { field, label, placeholder, multiline },
  value,
  editing,
  error,
  onOpen,
  onChange,
  onCommit,
}: {
  definition: DesignSectionFieldDefinition;
  value: string;
  editing: boolean;
  error: string | null;
  onOpen: (field: DesignSectionField) => void;
  onChange: (field: DesignSectionField, value: string) => void;
  onCommit: (field: DesignSectionField) => void;
}) {
  const input = useRef<TextInputInstance | null>(null);

  function open() {
    // Focus the next field while the keyboard is still up; the previous input
    // blurs but stays mounted, so nothing dismisses the keyboard first.
    input.current?.focus();
    onOpen(field);
  }

  return (
    <View className={cn("border-border border-b last:border-b-0", editing && "gap-2 px-4 py-3")}>
      {editing ? <Text variant="small">{label}</Text> : null}
      <Input
        key="row-input"
        ref={input}
        value={value}
        onChangeText={(next) => onChange(field, next)}
        onBlur={() => onCommit(field)}
        placeholder={editing ? placeholder : undefined}
        multiline={multiline}
        returnKeyType={multiline ? "default" : "done"}
        onSubmitEditing={multiline ? undefined : () => input.current?.blur()}
        textAlignVertical={multiline ? "top" : undefined}
        className={cn(editing ? multiline && "h-24 py-2" : "absolute inset-0 opacity-0")}
        pointerEvents={editing ? "auto" : "none"}
        accessible={editing}
        accessibilityElementsHidden={!editing}
        importantForAccessibility={editing ? "auto" : "no-hide-descendants"}
        accessibilityLabel={editing ? label : undefined}
      />
      {editing ? (
        error ? (
          <FieldError message={error} />
        ) : null
      ) : (
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: value || "Not set" }}
          className="active:bg-accent flex-row items-start justify-between gap-4 px-4 py-3"
        >
          <Text variant="muted">{label}</Text>
          {value ? (
            <Text className="flex-1 text-right">{value}</Text>
          ) : (
            <Text variant="muted" className="flex-1 text-right">
              Not set
            </Text>
          )}
          <RowPencil />
        </Pressable>
      )}
    </View>
  );
}
