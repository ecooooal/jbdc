import { router } from "expo-router";
import { Plus, Search, SlidersHorizontal } from "lucide-react-native";
import { useCallback } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme, useCardDensity, useGrouping } from "@/features/settings/react";
import type { CardDensity } from "@/features/settings";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { useReducerRunner } from "@/shared/hooks/use-reducer-runner";
import {
  LIBRARY_GRID_GAP,
  LIBRARY_HORIZONTAL_PADDING,
  LIBRARY_SIDE_PADDING,
  libraryGrid,
} from "../lib/grid";
import { groupLibraryDesigns, orderedLibraryDesigns } from "../lib/grouping";
import {
  createInitialLibraryScreenState,
  libraryScreenReducer,
  PRESS_HIGHLIGHT_HOLD_MS,
  type LibraryScreenEffect,
  type LibraryScreenEvent,
} from "../lib/library-screen-reducer";
import type { LibraryDesign } from "../lib/query";
import { useLibraryDesigns } from "../lib/use-library-designs";
import { DensityControl } from "./density-control";
import { GroupingSelect } from "./grouping-select";
import { LibraryCard } from "./library-card";
import { FAB_SCROLL_CLEARANCE, LibraryFab } from "./library-fab";
import type { PressHighlightHandlers } from "./press-highlight";
import { SingleView } from "./single-view";
import { SINGLE_VIEW_PANEL_CLEARANCE } from "./single-view-page";

/** The heading of the trailing group for designs in no Collection. */
const NO_COLLECTION_LABEL = "No collection";

/** The key and test id the unfiled group uses, where a Collection label would go. */
const NO_COLLECTION_KEY = "no-collection";

/** Splits the designs into the rows the chosen density asks for. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    rows.push(items.slice(start, start + size));
  }

  return rows;
}

/** One section's grid: its designs chunked into rows at the chosen density. */
function SectionGrid({
  designs,
  density,
  columns,
  cardWidth,
  pressFor,
}: {
  designs: readonly LibraryDesign[];
  density: Exclude<CardDensity, 1>;
  columns: number;
  cardWidth: number;
  pressFor: (designId: string) => PressHighlightHandlers;
}) {
  return (
    <View style={{ gap: LIBRARY_GRID_GAP }}>
      {chunk(designs, columns).map((row, index) => (
        <View
          key={row[0].id}
          testID={`library-row-${index}`}
          className="flex-row"
          style={{ gap: LIBRARY_GRID_GAP }}
        >
          {row.map((design) => (
            <View key={design.id} style={{ width: cardWidth }}>
              <LibraryCard design={design} density={density} press={pressFor(design.id)} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The Library screen: at density 1, the single view paging one Design at a
 * time; at 2 and 4, the grid of active designs; or the empty state offering
 * create. The chosen density decides between the pager and the grid, and the
 * card width follows the viewport, so rotating the device reflows the grid
 * instead of breaking it. The chosen grouping decides whether the grid is one
 * flat stream or sections under their Collection headers, and the pager walks
 * the same ordered list.
 */
export function LibraryScreen() {
  const { designs, error, status } = useLibraryDesigns();
  const { density, setDensity } = useCardDensity();
  const { grouping, setGrouping } = useGrouping();
  const { setTheme } = useAppTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const screenWidth = Math.max(0, viewportWidth - insets.left - insets.right);
  const contentWidth = Math.max(0, screenWidth - LIBRARY_HORIZONTAL_PADDING);
  const { columns, cardWidth } = libraryGrid(density, contentWidth);
  const arrangement = groupLibraryDesigns(designs, grouping);
  const isEmpty = status === "ready" && designs.length === 0;

  // The press declares its own beats: the held highlight waits out its timer
  // and sends the elapsed fact back, and the open effect carries the Design.
  // The FAB's chosen action likewise declares the route or theme it opens.
  const perform = useCallback(
    (effect: LibraryScreenEffect, dispatch: (event: LibraryScreenEvent) => void) => {
      switch (effect.type) {
        case "hold-cards-open":
          setTimeout(
            () => dispatch({ type: "hold-elapsed", designId: effect.designId }),
            PRESS_HIGHLIGHT_HOLD_MS,
          );
          return;
        case "open-design":
          router.push({ pathname: "/designs/[id]", params: { id: effect.designId } });
          return;
        case "open-create-screen":
          router.push("/designs/new");
          return;
        case "apply-theme":
          setTheme(effect.scheme);
          return;
      }
    },
    [setTheme],
  );

  const [state, dispatch] = useReducerRunner(
    libraryScreenReducer,
    createInitialLibraryScreenState,
    perform,
  );

  const pressFor = (designId: string): PressHighlightHandlers => ({
    pressed: state.press?.designId === designId,
    onPressIn: () => dispatch({ type: "press-started", designId }),
    onPressOut: () => dispatch({ type: "press-released", designId }),
    onPress: () => dispatch({ type: "card-tapped", designId }),
  });

  // The FAB clears the single view's details panel, which only sits there when
  // that view is what the screen shows.
  const overSingleView = density === 1 && status === "ready" && designs.length > 0;
  const fabBottom = insets.bottom + (overSingleView ? SINGLE_VIEW_PANEL_CLEARANCE : 16);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
      <View
        testID="library-content"
        className="flex-1"
        accessibilityElementsHidden={state.actionsOpen}
        importantForAccessibility={state.actionsOpen ? "no-hide-descendants" : "auto"}
      >
        <View className="pt-6" style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}>
          <View className="z-10 flex-row flex-wrap items-center gap-3">
            <GroupingSelect grouping={grouping} onChange={setGrouping} />
            <DensityControl density={density} onChange={setDensity} />
            <View className="ml-auto flex-row items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                disabled
                accessibilityLabel="Search"
                className="h-12 w-12 sm:h-12 sm:w-12"
              >
                <Icon as={Search} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled
                accessibilityLabel="Filter"
                className="h-12 w-12 sm:h-12 sm:w-12"
              >
                <Icon as={SlidersHorizontal} />
              </Button>
            </View>
          </View>

          {error ? <Text className="text-destructive mt-6">{error.message}</Text> : null}
        </View>

        {status === "loading" ? null : isEmpty ? (
          <View
            className="flex-1 items-center justify-center gap-5 pb-16"
            style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}
          >
            <View className="items-center gap-2">
              <Text variant="h4">The library is empty</Text>
              <Text variant="muted" className="text-center">
                Designs you add will appear here.
              </Text>
            </View>
            <Button onPress={() => router.push("/designs/new")}>
              <Icon as={Plus} />
              <Text>Create a design</Text>
            </Button>
          </View>
        ) : density === 1 ? (
          <SingleView
            designs={orderedLibraryDesigns(arrangement)}
            width={screenWidth}
            pressFor={pressFor}
          />
        ) : (
          <View className="flex-1" style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}>
            <ScrollView
              className="mt-6 flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + FAB_SCROLL_CLEARANCE }}
            >
              {arrangement.kind === "grouped" ? (
                <View className="gap-6">
                  {arrangement.sections.map((section) => (
                    <View
                      key={section.collection ?? NO_COLLECTION_KEY}
                      testID={`library-section-${section.collection ?? NO_COLLECTION_KEY}`}
                      className="gap-3"
                    >
                      <Text variant="h4" aria-level={3}>
                        {section.collection ?? NO_COLLECTION_LABEL}
                      </Text>
                      <SectionGrid
                        designs={section.designs}
                        density={density}
                        columns={columns}
                        cardWidth={cardWidth}
                        pressFor={pressFor}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View className="gap-6">
                  <SectionGrid
                    designs={arrangement.designs}
                    density={density}
                    columns={columns}
                    cardWidth={cardWidth}
                    pressFor={pressFor}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      <LibraryFab bottom={fabBottom} open={state.actionsOpen} send={dispatch} />
    </SafeAreaView>
  );
}
