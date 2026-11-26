import { View } from "react-native";
import { IMAGE_KINDS } from "@/features/database";
import { Text } from "@/shared/components/ui/text";

/**
 * The gallery's frame while its images read is still loading: the same 3:4
 * plate, four equal stage tabs, and one line of journey thumbs the loaded
 * gallery draws, so the identity above and the sections below never move when
 * the images arrive. The plate names the wait once; everything else is Kraft
 * tone, because nothing here announces itself.
 */
export function GalleryLoading() {
  return (
    <View
      testID="gallery-loading"
      className="gap-3"
      accessible
      accessibilityLabel="Loading photography"
      accessibilityState={{ busy: true }}
    >
      <View
        testID="gallery-loading-plate"
        className="bg-muted w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: 3 / 4 }}
      >
        <View className="h-full w-full p-3">
          <View className="border-muted-foreground h-full w-full items-center justify-center rounded-md border border-dashed px-6">
            <Text variant="muted" accessible={false} className="text-center">
              Loading photography…
            </Text>
          </View>
        </View>
      </View>

      <View>
        <View
          testID="gallery-loading-tabs"
          className="border-border bg-background rounded-xl border p-0.5"
        >
          <View className="flex-row items-stretch">
            {IMAGE_KINDS.map((kind) => (
              <View key={kind} className="min-h-11 flex-1 items-center justify-center gap-0.5 py-1">
                <View className="bg-muted h-2.5 w-10 rounded-sm" />
                <View className="bg-muted h-2 w-6 rounded-sm" />
              </View>
            ))}
          </View>
        </View>

        <View testID="gallery-loading-thumbs" className="flex-row gap-2 overflow-hidden pt-2">
          {[0, 1, 2, 3].map((thumb) => (
            <View key={thumb} className="bg-muted aspect-[3/4] w-16 rounded-lg" />
          ))}
        </View>
      </View>
    </View>
  );
}
