import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';

/**
 * One entry created without leaving the form that needs it. The Collection form
 * adds the optional year field; every other inline creation leaves it out.
 */
export function InlineCreationPanel({
  title,
  submitLabel,
  name,
  yearField,
  error,
  maxLength,
  onNameChange,
  onSubmit,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  name: string;
  yearField?: { value: string; onChange: (year: string) => void };
  error: string | null;
  maxLength: number;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <View className="border-border gap-3 rounded-xl border p-3">
      <Text variant="small">{title}</Text>
      <Input
        value={name}
        onChangeText={onNameChange}
        placeholder="Name"
        maxLength={maxLength}
        autoFocus
        accessibilityLabel={`${title} name`}
      />
      {yearField ? (
        <Input
          value={yearField.value}
          onChangeText={yearField.onChange}
          placeholder="Year (optional)"
          keyboardType="number-pad"
          accessibilityLabel={`${title} year`}
        />
      ) : null}
      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
      <View className="flex-row justify-end gap-2">
        <Button size="sm" variant="ghost" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
        <Button size="sm" onPress={onSubmit}>
          <Text>{submitLabel}</Text>
        </Button>
      </View>
    </View>
  );
}
