import { Plus } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { ScrollView, View, type ScrollViewInstance } from "react-native";
import { Sheet, SheetBody } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { Textarea } from "@/shared/components/ui/textarea";
import type { GalleryFact, ImageNoteComposer } from "../lib/gallery-reducer";
import { IMAGE_NOTE_MAX_LENGTH } from "../lib/image-notes";
import type { ImageNote } from "../lib/images";
import { NotesList } from "./notes-list";

/**
 * The current image's notes in one paper sheet: the count and Close stay at the
 * top, Add note expands the inline composer beneath them, and every note reads
 * below, oldest first, with the two-step delete. Only the list scrolls, so the
 * header and the composer never leave the screen. The draft, the open state,
 * and the armed row live in the gallery reducer; a stored note collapses the
 * composer while the sheet stays open, and closing the sheet drops the draft
 * and disarms the row.
 */
export function NotesSheet({
  open,
  notes,
  composer,
  armedNoteId,
  send,
}: {
  open: boolean;
  notes: readonly ImageNote[];
  composer: ImageNoteComposer | null;
  armedNoteId: string | null;
  send: (fact: GalleryFact) => void;
}) {
  const list = useRef<ScrollViewInstance>(null);
  const lastNoteId = notes.at(-1)?.id;
  const previousLastNoteId = useRef(lastNoteId);

  // A stored note arrives through the live read while the sheet is open; move
  // the list to it so the owner sees what she just wrote without closing the
  // sheet. The last note's id, not the count, says one arrived: a read that
  // saves and deletes in one pass can leave the count unchanged. Opening the
  // sheet changes no id, so it still starts at the oldest note.
  useEffect(() => {
    if (lastNoteId !== previousLastNoteId.current) {
      list.current?.scrollToEnd({ animated: true });
    }

    previousLastNoteId.current = lastNoteId;
  }, [lastNoteId]);

  return (
    <Sheet open={open} onClose={() => send({ type: "notes-sheet-closed" })}>
      {open ? (
        <SheetBody testID="notes-sheet">
          <SheetHeader
            title={`Notes (${notes.length})`}
            closeLabel="Close notes"
            onClose={() => send({ type: "notes-sheet-closed" })}
          />

          {composer ? (
            <View className="gap-3">
              <Textarea
                accessibilityLabel="New note"
                placeholder="What did you decide here, and why?"
                numberOfLines={3}
                maxLength={IMAGE_NOTE_MAX_LENGTH}
                value={composer.draft}
                onChangeText={(draft) => send({ type: "image-note-draft-changed", draft })}
                autoFocus
              />
              <View className="flex-row justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  accessibilityLabel="Cancel note"
                  onPress={() => send({ type: "image-note-composer-closed" })}
                >
                  <Text>Cancel</Text>
                </Button>
                <Button
                  size="sm"
                  accessibilityLabel="Save note"
                  disabled={composer.draft.trim().length === 0}
                  onPress={() => send({ type: "image-note-save-pressed" })}
                >
                  <Text>Save note</Text>
                </Button>
              </View>
            </View>
          ) : (
            <Button
              variant="ghost"
              className="justify-start px-0"
              accessibilityLabel="Add note"
              onPress={() => send({ type: "image-note-composer-opened" })}
            >
              <Icon as={Plus} className="text-muted-foreground size-4" />
              <Text>Add note</Text>
            </Button>
          )}

          <ScrollView
            ref={list}
            accessibilityLabel="Notes"
            className="border-border border-t"
            contentContainerClassName="pt-1"
            showsVerticalScrollIndicator={false}
          >
            <NotesList
              notes={notes}
              armedNoteId={armedNoteId}
              onDeletePress={(noteId) => send({ type: "image-note-delete-pressed", noteId })}
            />
          </ScrollView>
        </SheetBody>
      ) : null}
    </Sheet>
  );
}
