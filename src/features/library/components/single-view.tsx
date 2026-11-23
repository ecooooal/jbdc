import { useCallback, useState } from "react";
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Text } from "@/shared/components/ui/text";
import type { LibraryDesign } from "../lib/query";
import { SingleViewPage } from "./single-view-page";

/** The page a settled horizontal offset lands on, kept inside the designs it has. */
function settledPage(offsetX: number, pageWidth: number, count: number): number {
  if (pageWidth <= 0 || count <= 0) return 0;

  return Math.min(Math.max(Math.round(offsetX / pageWidth), 0), count - 1);
}

/**
 * The single view: a horizontal, bounded pager of full-screen Design pages,
 * opening on the first and stopping at both ends. A gesture decides nothing
 * until it ends; the position chip follows the page the scroll view settles on.
 * The pages are laid out in the order the grouping selector produced, so a
 * swipe walks exactly what the grids show.
 */
export function SingleView({
  designs,
  width,
  onOpen,
}: {
  designs: readonly LibraryDesign[];
  /** The exact width one page gets, so pages line up with the screen. */
  width: number;
  onOpen: (design: LibraryDesign) => void;
}) {
  const [page, setPage] = useState(0);
  const settled = Math.min(page, Math.max(designs.length - 1, 0));
  const settle = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;

      setPage(settledPage(contentOffset.x, layoutMeasurement.width, designs.length));
    },
    [designs.length],
  );

  return (
    <View className="mt-6 flex-1 overflow-hidden">
      <FlatList
        testID="single-view"
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        data={designs}
        keyExtractor={(design) => design.id}
        renderItem={({ item }) => (
          <SingleViewPage design={item} width={width} onPress={() => onOpen(item)} />
        )}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
      />
      {designs.length > 0 ? (
        <View
          pointerEvents="none"
          className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1"
        >
          <Text className="text-xs font-semibold text-white">
            {settled + 1} / {designs.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
