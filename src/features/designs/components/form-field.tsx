import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';

/** A labelled section on a design form. */
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="small">{label}</Text>
      {children}
    </View>
  );
}
