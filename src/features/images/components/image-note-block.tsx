import { Plus, X } from "lucide-react-native";
import type { Dispatch } from "react";
import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { Textarea } from "@/shared/components/ui/textarea";
import type { ImageNoteBlockView, GalleryEvent, ImageNoteComposer } from "../lib/gallery-reducer";
import type { ImageNote } from "../lib/images";

/**
 * The current image's commentary, directly under the hero: what the owner
 * decided there and why. The list shows its first two notes with one control
 * for the rest; adding opens the composer in place, and a note is removed in
 * one press — no confirmation, no inline edit, because a correction is a
 * delete-and-rewrite. The composer and the list's expansion belong to the
 * gallery reducer, so changing the image drops both rather than carrying a
 * half-written note to another picture. Save and delete only declare the write;
 * the composer closes when the stored note's event arrives, so a refused note
 * keeps the owner's words.
 */
export function ImageNoteBlock({
  view,
  composer,
  dispatch,
}: {
  view: ImageNoteBlockView<ImageNote>;
  composer: ImageNoteComposer | null;
  dispatch: Dispatch<GalleryEvent>;
}) {
  return (
    <View className="border-border rounded-2xl border px-3 pb-2 pt-1">
      <View className="flex-row items-center justify-between">
        <Text variant="small" className="font-semibold">
          {view.total > 0 ? `Notes (${view.total})` : "Notes"}
        </Text>
        {composer ? null : (
          <Button
            size="icon"
            variant="ghost"
            accessibilityLabel="Add note"
            onPress={() => dispatch({ type: "image-note-composer-opened" })}
          >
            <Icon as={Plus} className="text-muted-foreground size-4" />
          </Button>
        )}
      </View>

      {view.total === 0 && !composer ? (
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
            onPress={() => dispatch({ type: "image-note-delete-pressed", noteId: note.id })}
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
          onPress={() => dispatch({ type: "image-notes-more-pressed" })}
        >
          <Text variant="muted">
            {view.expanded ? "Show fewer" : `Show all ${view.total} notes`}
          </Text>
        </Button>
      ) : null}

      {composer ? (
        <View className="mt-1 gap-2">
          <Textarea
            accessibilityLabel="New note"
            placeholder="What did you decide here, and why?"
            numberOfLines={3}
            value={composer.draft}
            onChangeText={(draft) => dispatch({ type: "image-note-draft-changed", draft })}
            autoFocus
          />
          <View className="flex-row justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              accessibilityLabel="Cancel note"
              onPress={() => dispatch({ type: "image-note-composer-closed" })}
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              size="sm"
              accessibilityLabel="Save note"
              onPress={() => dispatch({ type: "image-note-save-pressed" })}
            >
              <Text>Save note</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
