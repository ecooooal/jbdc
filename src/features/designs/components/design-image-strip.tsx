import { View } from "react-native";

/**
 * Where the Images slice puts the design's images. This slice only reserves
 * the strip's height, so the hero has its final shape before images arrive.
 */
export function DesignImageStrip() {
  return (
    <View className="flex-row gap-2" accessibilityLabel="Design images">
      {[0, 1, 2].map((index) => (
        <View key={index} className="border-border h-24 flex-1 rounded-lg border border-dashed" />
      ))}
    </View>
  );
}
