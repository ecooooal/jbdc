import { Image } from "expo-image";
import { Shirt } from "lucide-react-native";
import { View } from "react-native";
import { designStatusLabel } from "@/features/designs";
import { DesignStatusBadge } from "@/features/designs/react";
import { useImageUri } from "@/features/images/react";
import type { LibraryDesign } from "../lib/query";
import type { CardDensity } from "@/features/settings";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { PressHighlight, type PressHighlightHandlers } from "./press-highlight";

function Meta({ value, placeholder }: { value: string | null; placeholder: string }) {
  return value ? (
    <Text variant="muted" numberOfLines={1} className="shrink">
      {value}
    </Text>
  ) : (
    <Text variant="muted" numberOfLines={1} className="shrink italic">
      {placeholder}
    </Text>
  );
}

function MetaStack({ design }: { design: LibraryDesign }) {
  return (
    <View className="gap-0.5">
      <Meta value={design.category} placeholder="No category" />
      <Meta value={design.collection} placeholder="No collection" />
    </View>
  );
}

/** The design's Cover, or the quiet stand-in an image-less design keeps. */
function Cover({ design, className }: { design: LibraryDesign; className?: string }) {
  const uri = useImageUri(design.cover);

  if (!uri) {
    return (
      <View
        testID="cover-placeholder"
        className={cn("bg-muted items-center justify-center", className)}
      >
        <Icon as={Shirt} className="text-muted-foreground size-5 opacity-60" />
      </View>
    );
  }

  return (
    <View className={cn("bg-muted overflow-hidden", className)}>
      <Image
        testID="library-cover"
        source={{ uri }}
        accessibilityLabel={`Cover of ${design.name}`}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}

/** The card's one corner rule: compact corners at four per row, roomy at two. */
function cornerClass(density: Exclude<CardDensity, 1>): string {
  return density === 4 ? "rounded-lg" : "rounded-xl";
}

/** Density 2 and 4: a cover-first tile. Four per row keeps only the name readable. */
function Tile({ design, density }: { design: LibraryDesign; density: Exclude<CardDensity, 1> }) {
  const compact = density === 4;

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", cornerClass(density))}>
      <Cover design={design} className={cn("w-full", compact ? "aspect-square" : "aspect-[4/5]")} />
      <View className={cn("gap-2", compact ? "p-2" : "p-3")}>
        <Text
          role="heading"
          className={cn("font-medium", compact ? "text-xs leading-4" : "text-base leading-5")}
          numberOfLines={2}
        >
          {design.name}
        </Text>
        {compact ? (
          <Text variant="muted" className="text-[10px] leading-3" numberOfLines={1}>
            {designStatusLabel(design.status)}
          </Text>
        ) : (
          <>
            <MetaStack design={design} />
            <View className="self-start">
              <DesignStatusBadge status={design.status} />
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

/**
 * One Design in the Library. The shape follows the owner's chosen density: two
 * is a roomy tile, four is a compact tile that keeps the cover and name
 * legible; density one is the single view and draws no card. The whole card is
 * one button: pressing it dips and tints, then opens that Design.
 */
export function LibraryCard({
  design,
  density,
  press,
}: {
  design: LibraryDesign;
  density: Exclude<CardDensity, 1>;
  press: PressHighlightHandlers;
}) {
  return (
    <PressHighlight
      accessibilityLabel={design.name}
      overlayClassName={cornerClass(density)}
      {...press}
    >
      <Tile design={design} density={density} />
    </PressHighlight>
  );
}
