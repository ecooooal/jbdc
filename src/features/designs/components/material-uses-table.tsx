import { View } from 'react-native';
import type { MaterialUse } from '@/features/designs';
import { Text } from '@/shared/components/ui/text';
import { materialUseRoleLabel } from '../lib/material-use-role';

/**
 * The `Material / Colour / Role` table. Edit renders it above `＋ Add
 * material`; Detail renders the same rows read-only. Uses arrive already
 * ordered by role then Material name.
 */
export function MaterialUsesTable({ uses }: { uses: MaterialUse[] }) {
  return (
    <View className="border-border overflow-hidden rounded-xl border">
      <View className="border-border bg-muted/40 flex-row gap-3 border-b px-4 py-2">
        <Text variant="small" className="flex-[2]">
          Material
        </Text>
        <Text variant="small" className="flex-[2]">
          Colour
        </Text>
        <Text variant="small" className="flex-1">
          Role
        </Text>
      </View>

      {uses.length === 0 ? (
        <Text variant="muted" className="px-4 py-3">
          No materials yet
        </Text>
      ) : (
        uses.map((use) => (
          <View
            key={use.id}
            className="border-border flex-row gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <Text className="flex-[2]">{use.materialName}</Text>
            <Text className="flex-[2]">{use.colour}</Text>
            <Text variant="muted" className="flex-1">
              {materialUseRoleLabel(use.role)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
