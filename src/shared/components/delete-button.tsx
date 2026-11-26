import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import Animated, {
  cubicBezier,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";

const AnimatedButton = Animated.createAnimatedComponent(Button);

/** The swap's arrival and the button's own width settle share one quiet beat. */
const SWAP_MS = 160;
/** The press beat: under 150ms, so the control answers before the eye waits. */
const PRESS_MS = 120;

const SWAP_LAYOUT = LinearTransition.duration(SWAP_MS).reduceMotion(ReduceMotion.System);
const CONTENT_ENTER = FadeIn.duration(SWAP_MS).reduceMotion(ReduceMotion.System);
const CONTENT_EXIT = FadeOut.duration(90).reduceMotion(ReduceMotion.System);
const PRESS_EASE = cubicBezier(0.23, 1, 0.32, 1);

/**
 * The one delete control: a trash glyph at rest that becomes the confirm word
 * on the first press. The surface reducer owns the two-step rule and passes
 * `armed`; the second press, on that same word, confirms. The word is the
 * control, so no separate cue can look pressable without being pressable.
 * While unarmed, the control announces the rule to a screen reader, so every
 * delete promises the same two presses. `overPhotography` swaps the paper
 * palette for the image detail's white ink.
 *
 * The swap arrives in the quiet budget: the glyph fades out while the word
 * fades in, and the button's own width settles around it, so the row reads the
 * control growing rather than a new one appearing. A 0.97 press dip is the one
 * motion this control adds to the shared tonal wash. Reduced motion keeps the
 * state change and the wash, drops the dip, and resolves the swap on the spot.
 */
export function DeleteButton({
  accessibilityLabel,
  object,
  action = "delete",
  armed,
  overPhotography = false,
  onPress,
}: {
  /** The control's accessible name, e.g. "Delete note 1". */
  accessibilityLabel: string;
  /** The grammatical object for the press hints, e.g. "this note". */
  object: string;
  /** The verb the surface uses for this deletion. */
  action?: "delete" | "remove";
  /** True once the first press has armed this control. */
  armed: boolean;
  /** True on the image detail's black photography surface. */
  overPhotography?: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const hint = armed
    ? `${action === "delete" ? "Deletes" : "Removes"} ${object}`
    : `Press twice in a row to ${action} ${object}`;

  return (
    <AnimatedButton
      layout={SWAP_LAYOUT}
      size={armed ? "sm" : "icon"}
      variant={armed ? "destructive" : "ghost"}
      className={cn(!armed && overPhotography && "active:bg-photography-ink/10")}
      style={{
        transform: [{ scale: pressed && !reduced ? 0.97 : 1 }],
        transitionProperty: "transform",
        transitionDuration: `${reduced ? 0 : PRESS_MS}ms`,
        transitionTimingFunction: PRESS_EASE,
      }}
      hitSlop={4}
      pressRetentionOffset={16}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={hint}
      accessibilityLiveRegion={armed ? "polite" : undefined}
      onPress={onPress}
    >
      {armed ? (
        <Animated.View key="confirm" entering={CONTENT_ENTER} exiting={CONTENT_EXIT}>
          <Text>{action === "delete" ? "Delete" : "Remove"}</Text>
        </Animated.View>
      ) : (
        <Animated.View key="trash" entering={CONTENT_ENTER} exiting={CONTENT_EXIT}>
          <Icon
            as={Trash2}
            className={cn(
              "size-4",
              overPhotography ? "text-photography-ink/60" : "text-muted-foreground",
            )}
          />
        </Animated.View>
      )}
    </AnimatedButton>
  );
}
