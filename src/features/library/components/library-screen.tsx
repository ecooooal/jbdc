import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCardDensity } from '@/features/settings/react';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import {
  LIBRARY_GRID_GAP,
  LIBRARY_HORIZONTAL_PADDING,
  LIBRARY_SIDE_PADDING,
  libraryGrid,
} from '../lib/grid';
import { useLibraryDesigns } from '../lib/use-library-designs';
import { DensityControl } from './density-control';
import { LibraryCard } from './library-card';

/** Splits the designs into the rows the chosen density asks for. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    rows.push(items.slice(start, start + size));
  }

  return rows;
}

/**
 * The Library screen: the grid of active designs, or the empty state offering
 * create. The chosen density decides the column count; the card width follows
 * the viewport, so rotating the device reflows the grid instead of breaking it.
 */
export function LibraryScreen() {
  const { designs, error, status } = useLibraryDesigns();
  const { density, setDensity } = useCardDensity();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(
    0,
    viewportWidth - insets.left - insets.right - LIBRARY_HORIZONTAL_PADDING
  );
  const { columns, cardWidth } = libraryGrid(density, contentWidth);
  const rows = chunk(designs, columns);
  const isEmpty = status === 'ready' && designs.length === 0;

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-background"
      edges={['top', 'left', 'right']}
    >
      <View className="flex-1 pt-6" style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}>
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="h3">Library</Text>
          <View className="flex-row items-center gap-2">
            <DensityControl density={density} onChange={setDensity} />
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
        </View>

        {error ? (
          <Text className="text-destructive mt-6">{error.message}</Text>
        ) : null}

        {status === 'loading' ? null : isEmpty ? (
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
            <View className="pb-8" style={{ gap: LIBRARY_GRID_GAP }}>
              {rows.map((row) => (
                <View key={row[0].id} className="flex-row" style={{ gap: LIBRARY_GRID_GAP }}>
                  {row.map((design) => (
                    <View key={design.id} style={{ width: cardWidth }}>
                      <LibraryCard
                        design={design}
                        density={density}
                        onPress={() =>
                          router.push({ pathname: '/designs/[id]', params: { id: design.id } })
                        }
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
