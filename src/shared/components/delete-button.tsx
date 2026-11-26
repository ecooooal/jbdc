import { Trash2 } from "lucide-react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";

/**
 * The one delete control: a trash glyph that never deletes on its first press.
 * The surface reducer owns the two-step rule and passes `armed`; the first
 * press renders the armed glyph, and the second confirms. While unarmed, the
 * control announces the rule to a screen reader, so every delete promises the
 * same two presses. `overPhotography` swaps the paper palette for the image
 * detail's white ink and Photography Red.
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
  const hint = armed
    ? `${action === "delete" ? "Deletes" : "Removes"} ${object}`
    : `Press twice in a row to ${action} ${object}`;

  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn(overPhotography && "active:bg-photography-ink/10")}
      hitSlop={2}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={hint}
      onPress={onPress}
    >
      <Icon
        as={Trash2}
        className={cn(
          "size-4",
          armed
            ? overPhotography
              ? "text-destructive-on-photography"
              : "text-destructive"
            : overPhotography
              ? "text-photography-ink/60"
              : "text-muted-foreground",
        )}
      />
    </Button>
  );
}

/**
 * The armed line that names the second press. It sits where the surface has
 * room — under a note, beside the sheet footer's trash — and speaks in the
 * surface's own verb, so the delete control and its cue never disagree.
 */
export function DeleteCue({
  action = "delete",
  overPhotography = false,
}: {
  action?: "delete" | "remove";
  overPhotography?: boolean;
}) {
  return (
    <Text
      className={cn(
        "text-xs",
        overPhotography ? "text-destructive-on-photography" : "text-destructive",
      )}
      accessibilityLiveRegion="polite"
    >
      Tap again to {action}
    </Text>
  );
}
