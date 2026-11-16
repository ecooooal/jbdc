import { Pressable, View } from 'react-native';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import type { CreativeDirectionField } from '../lib/creative-direction-fields';
import type { EditDesignState } from '../lib/edit-design-reducer';
import type { SpecificationField } from '../lib/specification-fields';

export type SectionField = SpecificationField | CreativeDirectionField;

/**
 * One section's read-first rows: a line of `Label … value` until the owner
 * taps it; then the same row becomes its editor, one row at a time. A value
 * the owner has not recorded reads `Not set` in muted text.
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
  fields: readonly {
    field: SectionField;
    label: string;
    placeholder: string;
    multiline: boolean;
  }[];
  draft: EditDesignState['draft'];
  editing: EditDesignState['editing'];
  error: EditDesignState['error'];
  onOpen: (field: SectionField) => void;
  onChange: (field: SectionField, value: string) => void;
  onCommit: (field: SectionField) => void;
}) {
  return (
    <View className="border-border bg-background overflow-hidden rounded-xl border">
      {fields.map(({ field, label, placeholder, multiline }) => {
        if (editing === field) {
          return (
            <View key={field} className="border-border gap-2 border-b px-4 py-3 last:border-b-0">
              <Text variant="small">{label}</Text>
              <Input
                value={draft[field]}
                onChangeText={(value) => onChange(field, value)}
                onBlur={() => onCommit(field)}
                placeholder={placeholder}
                multiline={multiline}
                autoFocus
                returnKeyType={multiline ? 'default' : 'done'}
                onSubmitEditing={multiline ? undefined : () => onCommit(field)}
                textAlignVertical={multiline ? 'top' : undefined}
                className={multiline ? 'h-24 py-2' : undefined}
                accessibilityLabel={label}
              />
              {error?.field === field ? (
                <Text className="text-destructive text-sm">{error.message}</Text>
              ) : null}
            </View>
          );
        }

        return (
          <Pressable
            key={field}
            onPress={() => onOpen(field)}
            accessibilityRole="button"
            accessibilityLabel={label}
            className="border-border flex-row items-start justify-between gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <Text variant="muted">{label}</Text>
            {draft[field] ? (
              <Text className="flex-1 text-right">{draft[field]}</Text>
            ) : (
              <Text variant="muted" className="flex-1 text-right">
                Not set
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
