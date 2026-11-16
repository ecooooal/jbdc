import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import type { MaterialUse } from '@/features/designs';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { AddMaterialUseForm } from './add-material-use-form';
import { MaterialUsesTable } from './material-uses-table';

/**
 * The Specification tab's Materials block: the recorded uses, then
 * `＋ Add material`. The editor opens in place and closes once a use is
 * written, leaving the new row to the screen's live read and the use itself to
 * the visit that records one Event at close.
 */
export function MaterialUsesSection({
  designId,
  uses,
  onUseAdded,
}: {
  designId: string;
  uses: MaterialUse[];
  onUseAdded: (use: MaterialUse) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <View className="gap-2">
      <MaterialUsesTable uses={uses} />

      {isAdding ? (
        <AddMaterialUseForm
          designId={designId}
          onAdded={(use) => {
            setIsAdding(false);
            onUseAdded(use);
          }}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onPress={() => setIsAdding(true)}
        >
          <Icon as={Plus} />
          <Text>Add material</Text>
        </Button>
      )}
    </View>
  );
}
