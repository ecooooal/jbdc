import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/shared/lib/utils";

/** How far a pressed tap target dips: slight, never a pop. */
export const PRESS_HIGHLIGHT_SCALE = 0.98;

/**
 * The Library's tap target: pressing dips it and lays a quiet ink wash over
 * it. The wash is instant, like every other press in the world; only the
 * Detail arrival after it animates.
 */
export function PressHighlight({
  accessibilityLabel,
  children,
  className,
  overlayClassName,
  onPress,
}: {
  accessibilityLabel?: string;
  children: ReactNode;
  className?: string;
  /** The tint's corners, which follow the surface it covers. */
  overlayClassName?: string;
  onPress: () => void;
}) {
  const [held, setHeld] = useState(false);

  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => setHeld(true)}
      onPressOut={() => setHeld(false)}
      className={className}
      style={{ transform: [{ scale: held ? PRESS_HIGHLIGHT_SCALE : 1 }] }}
    >
      {children}
      <View
        pointerEvents="none"
        testID="press-highlight"
        className={cn("bg-foreground/5 absolute inset-0", overlayClassName)}
        style={{ opacity: held ? 1 : 0 }}
      />
    </Pressable>
  );
}
