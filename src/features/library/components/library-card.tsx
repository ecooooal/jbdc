import { Image } from "expo-image";
import { View } from "react-native";
import { DesignStatusBadge } from "@/features/designs/react";
import { useImageUri } from "@/features/images/react";
import type { LibraryDesign } from "../lib/query";
import { taxonomyLine } from "../lib/taxonomy-line";
import { Card } from "@/shared/components/ui/card";
import { Text } from "@/shared/components/ui/text";
import { EmptyCover } from "./empty-cover";
import { PressHighlight, type PressHighlightHandlers } from "./press-highlight";

/** The design's Cover, when it has one. */
function Cover({ name, uri }: { name: string; uri: string }) {
  return (
    <View className="bg-muted aspect-[4/5] w-full overflow-hidden">
      <Image
        testID="library-cover"
        source={{ uri }}
        accessibilityLabel={`Cover of ${name}`}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}

/**
 * Two per row: a cover-first tile. The Design's name is the loudest thing in
 * it — the title face, the same voice the single view gives it — over one
 * taxonomy line and the Status pill. The card fills its row's height and the
 * pill sits at the bottom, so a tile with a shorter name or no taxonomy still
 * ends on the same line as its neighbour.
 */
function Tile({ design, omitCollection }: { design: LibraryDesign; omitCollection: boolean }) {
  const uri = useImageUri(design.cover);
  const taxonomy = taxonomyLine(design, { omitCollection });

  return (
    <Card className="flex-1 gap-0 overflow-hidden rounded-xl py-0">
      {uri ? (
        <Cover name={design.name} uri={uri} />
      ) : (
        <EmptyCover name={design.name} size="tile" className="aspect-[4/5] w-full" />
      )}
      <View className="flex-1 gap-2 p-3">
        <Text
          role="heading"
          numberOfLines={2}
          className="font-serif text-2xl font-semibold leading-7 tracking-tight"
        >
          {design.name}
        </Text>
        {taxonomy ? (
          <Text className="text-muted-foreground font-mono text-xs leading-4" numberOfLines={2}>
            {taxonomy}
          </Text>
        ) : null}
        <View className="flex-1" />
        <View className="self-start">
          <DesignStatusBadge status={design.status} />
        </View>
      </View>
    </Card>
  );
}

/**
 * One Design in the Library at density 2. The whole card is one button:
 * pressing it dips and tints, then opens that Design. The single view draws no
 * card; it gives the same Design its own page.
 */
export function LibraryCard({
  design,
  omitCollection = false,
  press,
}: {
  design: LibraryDesign;
  /** Inside a Collection section the header already names the Collection. */
  omitCollection?: boolean;
  press: PressHighlightHandlers;
}) {
  return (
    <PressHighlight
      accessibilityLabel={design.name}
      className="flex-1"
      overlayClassName="rounded-xl"
      {...press}
    >
      <Tile design={design} omitCollection={omitCollection} />
    </PressHighlight>
  );
}
