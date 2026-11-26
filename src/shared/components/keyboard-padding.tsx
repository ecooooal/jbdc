import type { ReactNode } from "react";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

/**
 * Lifts a sheet's content by the keyboard's height, so a content detent grows
 * exactly as much as the keyboard covers. The padding runs on the UI thread
 * with the keyboard's own animation; the sheet follows the measured content
 * without adding a second animation of its own.
 */
export function KeyboardPadding({ children }: { children: ReactNode }) {
  const { height } = useReanimatedKeyboardAnimation();
  const padding = useAnimatedStyle(() => ({
    paddingBottom: Math.max(-height.get(), 0),
  }));

  return <Animated.View style={padding}>{children}</Animated.View>;
}
