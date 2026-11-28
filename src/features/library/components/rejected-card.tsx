import { Image } from "expo-image";
import { View } from "react-native";
import { useImageUri } from "@/features/images/react";
import { Card } from "@/shared/components/ui/card";
import { Text } from "@/shared/components/ui/text";
import type { RejectedDesign } from "../lib/query";
import { NO_REASON_RECORDED } from "../lib/rejected";
import { EmptyCover } from "./empty-cover";
import { PressHighlight, type PressHighlightHandlers } from "./press-highlight";

/** The design's Cover, when it has one. */
function Cover({ name, uri }: { name: string; uri: string }) {
  return (
    <View className="bg-muted aspect-[4/5] w-full overflow-hidden">
      <Image
        testID="rejected-cover"
        source={{ uri }}
        accessibilityLabel={`Cover of ${name}`}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}

/**
 * One rejected Design in the grid: the same cover-first tile the Library
 * draws, with the latest Decision's reason in the muted voice where the Status
 * pill would sit. The reason stops at two lines here — the single view carries
 * it whole. A Decision with no reason says so, so the tile never reads blank.
 */
function RejectedTile({ design }: { design: RejectedDesign }) {
  const uri = useImageUri(design.cover);

  return (
    <Card className="flex-1 gap-0 overflow-hidden rounded-xl py-0">
      {uri ? (
        <Cover name={design.name} uri={uri} />
      ) : (
        <EmptyCover name={design.name} size="tile" className="aspect-[4/5] w-full" />
      )}
      <View className="flex-1 gap-2 p-3">
        <Text role="heading" className="font-serif text-2xl font-semibold leading-7 tracking-tight">
          {design.name}
        </Text>
        <View className="flex-1" />
        <Text variant="muted" numberOfLines={2}>
          {design.reason ?? NO_REASON_RECORDED}
        </Text>
      </View>
    </Card>
  );
}

/**
 * One rejected Design at density 2. The whole card is one button, the same
 * press rule the Library's cards use: pressing dips and tints, then opens that
 * Design. The card's accessible name carries the reason the tile shows — or
 * that none was recorded — because the reason is the archive's point and the
 * child text is grouped under the button's own label. The single view gives
 * the same Design its own page.
 */
export function RejectedCard({
  design,
  press,
}: {
  design: RejectedDesign;
  press: PressHighlightHandlers;
}) {
  return (
    <PressHighlight
      accessibilityLabel={`${design.name}, ${design.reason ?? NO_REASON_RECORDED}`}
      className="flex-1"
      overlayClassName="rounded-xl"
      {...press}
    >
      <RejectedTile design={design} />
    </PressHighlight>
  );
}
