import { useCallback, useState } from "react";
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useImageUri } from "@/features/images/react";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { LibraryDesign } from "../lib/query";
import type { PressHighlightHandlers } from "./press-highlight";
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
  pressFor,
}: {
  designs: readonly LibraryDesign[];
  /** The exact width one page gets, so pages line up with the screen. */
  width: number;
  pressFor: (designId: string) => PressHighlightHandlers;
}) {
  const [page, setPage] = useState(0);
  const settled = Math.min(page, Math.max(designs.length - 1, 0));
  // The counter follows the page it counts: over photography it is the one
  // sanctioned translucent black, and over a plate it is a Kraft pill on paper.
  const overPhotography = useImageUri(designs[settled]?.cover ?? null) !== null;
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
          <SingleViewPage design={item} width={width} press={pressFor(item.id)} />
        )}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
      />
      {designs.length > 0 ? (
        <View
          testID="single-view-counter"
          pointerEvents="none"
          className={cn(
            "absolute right-4 top-4 rounded-full px-3 py-1",
            overPhotography ? "bg-overlay" : "bg-muted",
          )}
        >
          <Text
            className={cn(
              "text-xs font-semibold",
              overPhotography ? "text-overlay-foreground" : "text-foreground",
            )}
          >
            {settled + 1} / {designs.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
