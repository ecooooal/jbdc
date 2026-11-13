import { useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/features/database/react';
import { listLibraryDesigns } from '@/features/library';
import { Text } from '@/shared/components/ui/text';

export default function LibraryScreen() {
  const database = useDatabase();
  const libraryDesigns = useMemo(() => listLibraryDesigns(database.db), [database]);

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-6 pt-6">
        <Text variant="h3">Library</Text>

        {libraryDesigns.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2 pb-16">
            <Text variant="h4">The catalog is empty</Text>
            <Text variant="muted" className="text-center">
              Designs you add will appear here.
            </Text>
          </View>
        ) : (
          <View className="mt-6 gap-3">
            {libraryDesigns.map((design) => (
              <Text key={design.id}>{design.name}</Text>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
