import { Trash2 } from "lucide-react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";

/**
 * The one delete control: a trash glyph at rest that becomes the confirm word
 * on the first press. The surface reducer owns the two-step rule and passes
 * `armed`; the second press, on that same word, confirms. The word is the
 * control, so no separate cue can look pressable without being pressable.
 * While unarmed, the control announces the rule to a screen reader, so every
 * delete promises the same two presses. `overPhotography` swaps the paper
 * palette for the image detail's white ink.
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
      size={armed ? "sm" : "icon"}
      variant={armed ? "destructive" : "ghost"}
      className={cn(!armed && overPhotography && "active:bg-photography-ink/10")}
      hitSlop={4}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={hint}
      accessibilityLiveRegion={armed ? "polite" : undefined}
      onPress={onPress}
    >
      {armed ? (
        <Text>{action === "delete" ? "Delete" : "Remove"}</Text>
      ) : (
        <Icon
          as={Trash2}
          className={cn(
            "size-4",
            overPhotography ? "text-photography-ink/60" : "text-muted-foreground",
          )}
        />
      )}
    </Button>
  );
}
