import { router } from "expo-router";
import { Plus, Search, SlidersHorizontal } from "lucide-react-native";
import { useCallback, type ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme, useCardDensity, useGrouping } from "@/features/settings/react";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { useReducerRunner } from "@/shared/hooks/use-reducer-runner";
import { QUIET_ARRIVAL } from "@/shared/lib/motion";
import {
  LIBRARY_GRID_GAP,
  LIBRARY_HORIZONTAL_PADDING,
  LIBRARY_SIDE_PADDING,
  libraryGrid,
} from "../lib/grid";
import {
  groupLibraryDesigns,
  orderedLibraryDesigns,
  type LibraryArrangement,
} from "../lib/grouping";
import {
  createInitialLibraryScreenState,
  libraryScreenReducer,
  PRESS_HIGHLIGHT_HOLD_MS,
  type LibraryScreenEffect,
  type LibraryScreenEvent,
} from "../lib/library-screen-reducer";
import type { LibraryDesign } from "../lib/query";
import { useLibraryDesigns } from "../lib/use-library-designs";
import { useRejectedDesigns } from "../lib/use-rejected-designs";
import { DensityControl } from "./density-control";
import { LibraryCard } from "./library-card";
import { FAB_SCROLL_CLEARANCE, LibraryFab } from "./library-fab";
import type { PressHighlightHandlers } from "./press-highlight";
import { RejectedCard } from "./rejected-card";
import { RejectedSingleViewPage } from "./rejected-single-view-page";
import { SingleView } from "./single-view";
import { SingleViewPage } from "./single-view-page";
import { ViewControl } from "./view-control";

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

/** One section's grid: its designs chunked into two-per-row tiles. */
function SectionGrid<T extends LibraryDesign>({
  designs,
  columns,
  cardWidth,
  renderCard,
}: {
  designs: readonly T[];
  columns: number;
  cardWidth: number;
  renderCard: (design: T) => ReactNode;
}) {
  return (
    <View style={{ gap: LIBRARY_GRID_GAP }}>
      {chunk(designs, columns).map((row, index) => (
        <View
          key={row[0].id}
          testID={`library-row-${index}`}
          className="flex-row items-stretch"
          style={{ gap: LIBRARY_GRID_GAP }}
        >
          {row.map((design) => (
            <View key={design.id} style={{ width: cardWidth }}>
              {renderCard(design)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** The density-2 body: the flat stream, or one grid under each Collection header. */
function DesignGrid<T extends LibraryDesign>({
  arrangement,
  columns,
  cardWidth,
  renderCard,
}: {
  arrangement: LibraryArrangement<T>;
  columns: number;
  cardWidth: number;
  renderCard: (design: T) => ReactNode;
}) {
  if (arrangement.kind === "grouped") {
    return (
      <View className="gap-6">
        {arrangement.sections.map((section) => (
          <View
            key={section.collection ?? NO_COLLECTION_KEY}
            testID={`library-section-${section.collection ?? NO_COLLECTION_KEY}`}
            className="gap-3"
          >
            <View className="flex-row items-center gap-3">
              <Text role="heading" className="text-muted-foreground text-xs font-medium">
                {section.collection ?? NO_COLLECTION_LABEL}
              </Text>
              <View className="bg-border h-px flex-1" />
            </View>
            <SectionGrid
              designs={section.designs}
              columns={columns}
              cardWidth={cardWidth}
              renderCard={renderCard}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="gap-6">
      <SectionGrid
        designs={arrangement.designs}
        columns={columns}
        cardWidth={cardWidth}
        renderCard={renderCard}
      />
    </View>
  );
}

/** The active Library's empty state: the way to add the first Design. */
function LibraryEmptyState() {
  return (
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
  );
}

/**
 * The rejected view's empty state: it names what is absent and offers the one
 * way back to the Library. Add does not appear here — nothing has been
 * rejected, and a new Design is the active Library's work.
 */
function RejectedEmptyState({ onViewLibrary }: { onViewLibrary: () => void }) {
  return (
    <View
      className="flex-1 items-center justify-center gap-5 pb-16"
      style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}
    >
      <Text variant="h4">Nothing has been rejected</Text>
      <Button variant="outline" onPress={onViewLibrary}>
        <Text>View the library</Text>
      </Button>
    </View>
  );
}

/**
 * Search and filter, drawn as one paired control until their screens exist:
 * the two actions share the density control's outlined shell, and each says
 * why it does nothing yet.
 */
function SearchFilterActions() {
  return (
    <View className="border-input flex-row items-center overflow-hidden rounded-md border opacity-50">
      <Button
        size="icon"
        variant="ghost"
        disabled
        accessibilityLabel="Search"
        accessibilityHint="Coming soon"
        className="h-12 w-12 rounded-none opacity-100 sm:h-12 sm:w-12"
      >
        <Icon as={Search} />
      </Button>
      <View className="bg-border h-full w-px" />
      <Button
        size="icon"
        variant="ghost"
        disabled
        accessibilityLabel="Filter"
        accessibilityHint="Coming soon"
        className="h-12 w-12 rounded-none opacity-100 sm:h-12 sm:w-12"
      >
        <Icon as={SlidersHorizontal} />
      </Button>
    </View>
  );
}

/**
 * The Library screen, in the session view the header's control names. The
 * active Library shows the designs the Owner is working on; the Rejected
 * designs shows the rejected, non-deleted ones with the reason of their latest
 * Decision. Each view is the single view paging one Design at a time at
 * density 1, the grid at 2, or its own empty state; the chosen density decides
 * between the pager and the grid, and the card width follows the viewport, so
 * rotating the device reflows the grid instead of breaking it. The chosen
 * grouping decides whether a grid is one flat stream or sections under their
 * Collection labels, and the pager walks the same ordered list in either view.
 *
 * The view, the grouping, and emptiness each replace the whole body, so a
 * change arrives with the world's quiet fade rather than cutting between two
 * arrangements.
 */
export function LibraryScreen() {
  const library = useLibraryDesigns();
  const rejected = useRejectedDesigns();
  const { density, setDensity } = useCardDensity();
  const { grouping, setGrouping } = useGrouping();
  const { setTheme } = useAppTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const screenWidth = Math.max(0, viewportWidth - insets.left - insets.right);
  const contentWidth = Math.max(0, screenWidth - LIBRARY_HORIZONTAL_PADDING);
  const { columns, cardWidth } = libraryGrid(density, contentWidth);

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

  // The view decides which read the screen shows; both reads stay subscribed,
  // so switching back is already up to date. Each view keeps the chosen
  // grouping, and the pager walks the arrangement's order.
  const active = state.view === "rejected" ? rejected : library;
  const libraryArrangement = groupLibraryDesigns(library.designs, grouping);
  const rejectedArrangement = groupLibraryDesigns(rejected.designs, grouping);
  const isEmpty = active.status === "ready" && active.designs.length === 0;

  const pressFor = (designId: string): PressHighlightHandlers => ({
    pressed: state.press?.designId === designId,
    onPressIn: () => dispatch({ type: "press-started", designId }),
    onPressOut: () => dispatch({ type: "press-released", designId }),
    onPress: () => dispatch({ type: "card-tapped", designId }),
  });

  // The FAB keeps one corner at every density, so changing the view never
  // moves it. The single view's panel leaves that corner clear instead.
  const fabBottom = insets.bottom + 16;

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
      <View
        testID="library-content"
        className="flex-1"
        accessibilityElementsHidden={state.actionsOpen}
        importantForAccessibility={state.actionsOpen ? "no-hide-descendants" : "auto"}
      >
        <View className="pt-6" style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}>
          <View className="z-10 flex-row flex-wrap items-end gap-3">
            <ViewControl
              view={state.view}
              grouping={grouping}
              onViewChange={(checked) => dispatch({ type: "rejected-designs-checked", checked })}
              onGroupingChange={setGrouping}
            />
            <DensityControl density={density} onChange={setDensity} />
            <View className="ml-auto">
              <SearchFilterActions />
            </View>
          </View>

          {active.error ? (
            <Text className="text-destructive mt-6">{active.error.message}</Text>
          ) : null}
        </View>

        {active.status === "loading" ? null : (
          <Animated.View
            // A different view, a different grouping, or the first (or last)
            // Design replaces the whole body, so it arrives with the world's
            // quiet fade instead of cutting between two arrangements.
            key={`${state.view}:${density}:${grouping}:${isEmpty}`}
            entering={QUIET_ARRIVAL}
            className="flex-1"
          >
            {isEmpty ? (
              state.view === "rejected" ? (
                <RejectedEmptyState
                  onViewLibrary={() => dispatch({ type: "library-view-tapped" })}
                />
              ) : (
                <LibraryEmptyState />
              )
            ) : density === 1 ? (
              state.view === "rejected" ? (
                <SingleView
                  designs={orderedLibraryDesigns(rejectedArrangement)}
                  width={screenWidth}
                  renderPage={(design) => (
                    <RejectedSingleViewPage
                      design={design}
                      width={screenWidth}
                      press={pressFor(design.id)}
                    />
                  )}
                />
              ) : (
                <SingleView
                  designs={orderedLibraryDesigns(libraryArrangement)}
                  width={screenWidth}
                  renderPage={(design) => (
                    <SingleViewPage
                      design={design}
                      width={screenWidth}
                      press={pressFor(design.id)}
                    />
                  )}
                />
              )
            ) : (
              <View className="flex-1" style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}>
                <ScrollView
                  className="mt-6 flex-1"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + FAB_SCROLL_CLEARANCE }}
                >
                  {state.view === "rejected" ? (
                    <DesignGrid
                      arrangement={rejectedArrangement}
                      columns={columns}
                      cardWidth={cardWidth}
                      renderCard={(design) => (
                        <RejectedCard design={design} press={pressFor(design.id)} />
                      )}
                    />
                  ) : (
                    <DesignGrid
                      arrangement={libraryArrangement}
                      columns={columns}
                      cardWidth={cardWidth}
                      renderCard={(design) => (
                        <LibraryCard design={design} press={pressFor(design.id)} />
                      )}
                    />
                  )}
                </ScrollView>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      <LibraryFab
        bottom={fabBottom}
        open={state.actionsOpen}
        showAdd={state.view !== "rejected"}
        send={dispatch}
      />
    </SafeAreaView>
  );
}
