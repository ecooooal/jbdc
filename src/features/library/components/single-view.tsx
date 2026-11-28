import { useCallback, useState, type ReactNode } from "react";
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useImageUri } from "@/features/images/react";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { LibraryDesign } from "../lib/query";

/** The page a settled horizontal offset lands on, kept inside the designs it has. */
function settledPage(offsetX: number, pageWidth: number, count: number): number {
  if (pageWidth <= 0 || count <= 0) return 0;

  return Math.min(Math.max(Math.round(offsetX / pageWidth), 0), count - 1);
}

/**
 * The single view: a horizontal, bounded pager of full-screen Design pages,
 * opening on the first and stopping at both ends. A gesture decides nothing
 * until it ends; the position chip follows the page the scroll view settles on.
 * The pages are laid out in the chosen grouping's order, so a swipe walks
 * exactly what the grids show. The screen supplies each page, so
 * the Library and the rejected view share the pager and differ only in the
 * panel beneath the Cover.
 */
export function SingleView<T extends LibraryDesign>({
  designs,
  width,
  renderPage,
}: {
  designs: readonly T[];
  /** The exact width one page gets, so pages line up with the screen. */
  width: number;
  renderPage: (design: T) => ReactNode;
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
        renderItem={({ item }) => renderPage(item)}
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
