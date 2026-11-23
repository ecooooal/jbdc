import { router } from "expo-router";
import { Plus, Search, SlidersHorizontal } from "lucide-react-native";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useCardDensity, useGrouping } from "@/features/settings/react";
import type { CardDensity } from "@/features/settings";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import {
  LIBRARY_GRID_GAP,
  LIBRARY_HORIZONTAL_PADDING,
  LIBRARY_SIDE_PADDING,
  libraryGrid,
} from "../lib/grid";
import { groupLibraryDesigns } from "../lib/grouping";
import type { LibraryDesign } from "../lib/query";
import { useLibraryDesigns } from "../lib/use-library-designs";
import { DensityControl } from "./density-control";
import { GroupingSelect } from "./grouping-select";
import { LibraryCard } from "./library-card";

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
  onOpen,
}: {
  designs: readonly LibraryDesign[];
  density: CardDensity;
  columns: number;
  cardWidth: number;
  onOpen: (design: LibraryDesign) => void;
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
              <LibraryCard design={design} density={density} onPress={() => onOpen(design)} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The Library screen: the grid of active designs, or the empty state offering
 * create. The chosen density decides the column count; the card width follows
 * the viewport, so rotating the device reflows the grid instead of breaking it.
 * The chosen grouping decides whether the grid is one flat stream or sections
 * under their Collection headers.
 */
export function LibraryScreen() {
  const { designs, error, status } = useLibraryDesigns();
  const { density, setDensity } = useCardDensity();
  const { grouping, setGrouping } = useGrouping();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(
    0,
    viewportWidth - insets.left - insets.right - LIBRARY_HORIZONTAL_PADDING,
  );
  const { columns, cardWidth } = libraryGrid(density, contentWidth);
  const arrangement = groupLibraryDesigns(designs, grouping);
  const isEmpty = status === "ready" && designs.length === 0;
  const openDesign = (design: LibraryDesign) => {
    router.push({ pathname: "/designs/[id]", params: { id: design.id } });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
      <View className="flex-1 pt-6" style={{ paddingHorizontal: LIBRARY_SIDE_PADDING }}>
        <View className="z-10 flex-row items-center justify-between gap-3">
          <GroupingSelect grouping={grouping} onChange={setGrouping} />
          <View className="flex-row items-center gap-2">
            <DensityControl density={density} onChange={setDensity} />
            {designs.length > 0 ? (
              <Button
                size="icon"
                variant="outline"
                accessibilityLabel="Create design"
                onPress={() => router.push("/designs/new")}
              >
                <Icon as={Plus} />
              </Button>
            ) : null}
            <Button size="icon" variant="ghost" disabled accessibilityLabel="Search">
              <Icon as={Search} />
            </Button>
            <Button size="icon" variant="ghost" disabled accessibilityLabel="Filter">
              <Icon as={SlidersHorizontal} />
            </Button>
          </View>
        </View>

        {error ? <Text className="text-destructive mt-6">{error.message}</Text> : null}

        {status === "loading" ? null : isEmpty ? (
          <View className="flex-1 items-center justify-center gap-5 pb-16">
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
        ) : (
          <ScrollView className="mt-6 flex-1" showsVerticalScrollIndicator={false}>
            {arrangement.kind === "grouped" ? (
              <View className="gap-6 pb-8">
                {arrangement.sections.map((section) => (
                  <View
                    key={section.collection ?? NO_COLLECTION_KEY}
                    testID={`library-section-${section.collection ?? NO_COLLECTION_KEY}`}
                    className="gap-3"
                  >
                    <Text variant="h4">{section.collection ?? NO_COLLECTION_LABEL}</Text>
                    <SectionGrid
                      designs={section.designs}
                      density={density}
                      columns={columns}
                      cardWidth={cardWidth}
                      onOpen={openDesign}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View className="gap-6 pb-8">
                <SectionGrid
                  designs={arrangement.designs}
                  density={density}
                  columns={columns}
                  cardWidth={cardWidth}
                  onOpen={openDesign}
                />
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
