import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/shared/lib/utils";
import { PRESS_HIGHLIGHT_SCALE } from "../lib/library-screen-reducer";

/** The press state and the three gestures a tap target's surface hands down. */
export type PressHighlightHandlers = {
  pressed: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  onPress: () => void;
};

/**
 * The Library's tap target: pressing dips it and lays a quiet ink wash over
 * it. The surface owns whether it is pressed and when the tap's action runs,
 * so the wash stays up through the held beat; only the Detail arrival after it
 * animates. The wash is instant, like every other press in the world.
 */
export function PressHighlight({
  accessibilityLabel,
  children,
  className,
  overlayClassName,
  pressed,
  onPressIn,
  onPressOut,
  onPress,
}: {
  accessibilityLabel?: string;
  children: ReactNode;
  className?: string;
  /** The tint's corners, which follow the surface it covers. */
  overlayClassName?: string;
} & PressHighlightHandlers) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={className}
      style={{ transform: [{ scale: pressed ? PRESS_HIGHLIGHT_SCALE : 1 }] }}
    >
      {children}
      <View
        pointerEvents="none"
        testID="press-highlight"
        className={cn("bg-foreground/5 absolute inset-0", overlayClassName)}
        style={{ opacity: pressed ? 1 : 0 }}
      />
    </Pressable>
  );
}
