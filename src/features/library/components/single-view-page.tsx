import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignStatusBadge } from "@/features/designs/react";
import { useImageUri } from "@/features/images/react";
import { Text } from "@/shared/components/ui/text";
import type { LibraryDesign } from "../lib/query";

/**
 * The panel over the photography: the Design's name in the serif title face,
 * then its Status pill beside the Category and Collection in the sans face.
 * Its bottom padding clears the home indicator so the last line stays readable.
 */
function SingleViewPanel({ design }: { design: LibraryDesign }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="single-view-panel"
      className="bg-background/90 absolute bottom-0 left-0 right-0 gap-2 px-6 pt-4"
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      <Text variant="h3" numberOfLines={2}>
        {design.name}
      </Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <DesignStatusBadge status={design.status} />
        <Text variant="muted">
          {design.category ?? "No category"} · {design.collection ?? "No collection"}
        </Text>
      </View>
    </View>
  );
}

/**
 * One Design as a single-view page: its Cover fills the frame edge to edge,
 * and the panel states what the Owner is looking at. A Design with no Cover
 * keeps the same frame with the dashed placeholder, so every page holds its
 * shape and the panel never jumps.
 */
export function SingleViewPage({
  design,
  width,
  onPress,
}: {
  design: LibraryDesign;
  /** The page's exact width in dp, so a paged list lines its pages up. */
  width: number;
  onPress: () => void;
}) {
  const uri = useImageUri(design.cover);

  return (
    <View className="bg-muted h-full overflow-hidden" style={{ width }}>
      <Pressable
        role="button"
        accessibilityLabel={design.name}
        onPress={onPress}
        className="h-full w-full active:opacity-90"
      >
        {uri ? (
          <Image
            testID="single-view-cover"
            source={{ uri }}
            accessibilityLabel={`Cover of ${design.name}`}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View
            testID="single-view-placeholder"
            className="border-border h-full w-full items-center justify-center border border-dashed"
          />
        )}
      </Pressable>

      <SingleViewPanel design={design} />
    </View>
  );
}
