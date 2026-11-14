import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Database } from '@/features/database';
import { useDatabase, useLiveQuery } from '@/features/database/react';
import { libraryDesignsQuery, type LibraryDesign } from '@/features/library';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { LibraryCard } from './library-card';

type LibraryDesigns = {
  designs: LibraryDesign[];
  error: Error | undefined;
  /** False until the first read resolves, so an empty catalog is not shown early. */
  isLoaded: boolean;
};

/**
 * Subscribes to the Library's default query. Creates and edits land in the
 * returned designs without a manual refresh.
 */
function useLibraryDesigns(database: Database): LibraryDesigns {
  const query = useMemo(() => libraryDesignsQuery(database.db), [database]);
  const { data, error, updatedAt } = useLiveQuery(query, [query]);

  return { designs: data, error, isLoaded: updatedAt !== undefined };
}

/** The Library screen: the grid of active designs, or the empty state offering create. */
export function LibraryScreen() {
  const database = useDatabase();
  const { designs, error, isLoaded } = useLibraryDesigns(database);
  const isEmpty = isLoaded && designs.length === 0;

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-background"
      edges={['top', 'left', 'right']}
    >
      <View className="flex-1 px-6 pt-6">
        <View className="flex-row items-center justify-between">
          <Text variant="h3">Library</Text>
          {designs.length > 0 ? (
            <Button
              size="icon"
              variant="outline"
              accessibilityLabel="Create design"
              onPress={() => router.push('/designs/new')}
            >
              <Icon as={Plus} />
            </Button>
          ) : null}
        </View>

        {error ? (
          <Text className="text-destructive mt-6">{error.message}</Text>
        ) : null}

        {!isLoaded ? null : isEmpty ? (
          <View className="flex-1 items-center justify-center gap-5 pb-16">
            <View className="items-center gap-2">
              <Text variant="h4">The catalog is empty</Text>
              <Text variant="muted" className="text-center">
                Designs you add will appear here.
              </Text>
            </View>
            <Button onPress={() => router.push('/designs/new')}>
              <Icon as={Plus} />
              <Text>Create a design</Text>
            </Button>
          </View>
        ) : (
          <ScrollView className="mt-6 flex-1" showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-8">
              {designs.map((design) => (
                <LibraryCard key={design.id} design={design} />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
