import { Trash2 } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { ImageNote } from "../lib/images";
import { formatNoteDate } from "../lib/note-date";

/**
 * One image's notes as a read-only list: oldest first, each with its text and
 * created date. The trash control follows the two-step delete, so its first
 * press only arms the row — "Tap again to delete" — and the second dispatches
 * the removal. The rule lives in the gallery reducer; this list only renders
 * the armed id it is given. The notes sheet and the image detail share it, and
 * `overPhotography` gives the image detail's black surface white ink and white
 * hairlines instead of the paper palette.
 */
export function NotesList({
  notes,
  armedNoteId,
  onDeletePress,
  overPhotography = false,
}: {
  notes: readonly ImageNote[];
  armedNoteId: string | null;
  onDeletePress: (noteId: string) => void;
  /** True when the list sits on the image detail's black photography surface. */
  overPhotography?: boolean;
}) {
  if (notes.length === 0) {
    return (
      <Text variant="muted" className={cn(overPhotography && "text-photography-ink/60")}>
        No notes on this image.
      </Text>
    );
  }

  return (
    <View>
      {notes.map((note, index) => {
        const armed = note.id === armedNoteId;

        return (
          <View
            key={note.id}
            className={cn(
              "gap-1 py-3",
              index > 0 && "border-t",
              index > 0 && (overPhotography ? "border-photography-ink/15" : "border-border"),
            )}
          >
            <Text
              variant="muted"
              className={cn("font-mono text-xs", overPhotography && "text-photography-ink/60")}
            >
              {formatNoteDate(note.createdAt)}
            </Text>
            <View className="flex-row items-start gap-2">
              <Text className={cn("flex-1", overPhotography && "text-photography-ink")}>
                {note.text}
              </Text>
              <Button
                size="icon"
                variant="ghost"
                className={cn(overPhotography && "active:bg-photography-ink/10")}
                accessibilityLabel={`Delete note ${index + 1}`}
                accessibilityHint={
                  armed ? "Deletes this note" : "Press twice in a row to delete this note"
                }
                onPress={() => onDeletePress(note.id)}
              >
                <Icon
                  as={Trash2}
                  className={cn(
                    "size-4",
                    armed
                      ? "text-destructive"
                      : overPhotography
                        ? "text-photography-ink/60"
                        : "text-muted-foreground",
                  )}
                />
              </Button>
            </View>
            {armed ? (
              <Text className="text-destructive text-xs" accessibilityLiveRegion="polite">
                Tap again to delete
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
