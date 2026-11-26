import { NotebookText } from "lucide-react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";

/**
 * The notes button at the pager's bottom right: the current image's note count
 * on a dark pill over the photography. One press opens the notes sheet; the
 * pill carries no open state and no rows of its own.
 */
export function GalleryNotesButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="active:bg-photography border-overlay-foreground/15 rounded-full border bg-overlay px-3"
      accessibilityLabel={`Notes (${count})`}
      hitSlop={4}
      onPress={onPress}
    >
      <Icon as={NotebookText} className="size-4 text-overlay-foreground" />
      <Text className="text-xs font-semibold text-overlay-foreground">{count}</Text>
    </Button>
  );
}
