import { Plus, X } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import type { GalleryFact, ImageNoteBlockView } from "../lib/gallery-reducer";
import type { ImageNote } from "../lib/images";

/**
 * The current image's commentary: what the owner decided there and why. The
 * list shows its first two notes with one control for the rest, adding opens
 * the composer sheet, and a note is removed in one press — no confirmation, no
 * inline edit, because a correction is a delete-and-rewrite. The list's
 * expansion belongs to the gallery reducer, so changing the image drops it
 * rather than carrying the expanded list to another picture. A delete only
 * declares the write; the live read is the only answer.
 */
export function ImageNoteBlock({
  view,
  send,
}: {
  view: ImageNoteBlockView<ImageNote>;
  send: (fact: GalleryFact) => void;
}) {
  return (
    <View className="border-border rounded-2xl border px-3 pb-2 pt-1">
      <View className="flex-row items-center justify-between">
        <Text variant="small" className="font-semibold">
          {view.total > 0 ? `Notes (${view.total})` : "Notes"}
        </Text>
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Add note"
          onPress={() => send({ type: "image-note-composer-opened" })}
        >
          <Icon as={Plus} className="text-muted-foreground size-4" />
        </Button>
      </View>

      {view.total === 0 ? (
        <Text variant="muted">No notes yet. Add what you decided here, and why.</Text>
      ) : null}

      {view.shown.map((note, index) => (
        <View
          key={note.id}
          className="border-border flex-row items-start justify-between gap-2 border-t py-1"
        >
          <Text className="flex-1 py-1">{note.text}</Text>
          <Button
            size="icon"
            variant="ghost"
            accessibilityLabel={`Delete note ${index + 1}`}
            onPress={() => send({ type: "image-note-delete-pressed", noteId: note.id })}
          >
            <Icon as={X} className="text-muted-foreground size-4" />
          </Button>
        </View>
      ))}

      {view.collapsible ? (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          accessibilityLabel={view.expanded ? "Show fewer notes" : `Show all ${view.total} notes`}
          onPress={() => send({ type: "image-notes-more-pressed" })}
        >
          <Text variant="muted">
            {view.expanded ? "Show fewer" : `Show all ${view.total} notes`}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}
