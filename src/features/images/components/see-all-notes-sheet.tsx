import { ScrollView, View } from "react-native";
import { Sheet } from "@/shared/components/sheet";
import { Button } from "@/shared/components/ui/button";
import { Text } from "@/shared/components/ui/text";
import type { ImageNote } from "../lib/images";
import { NotesList } from "./notes-list";

/**
 * Every note on the current image, oldest first, in a scrollable paper sheet.
 * The list carries the two-step delete; this sheet adds the count and the close
 * control. Closing the sheet disarms any row in the gallery reducer, so a
 * return visit never deletes on a single press.
 */
export function SeeAllNotesSheet({
  open,
  notes,
  armedNoteId,
  onDeletePress,
  onClose,
}: {
  open: boolean;
  notes: readonly ImageNote[];
  armedNoteId: string | null;
  onDeletePress: (noteId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      {open ? (
        <View testID="see-all-notes" className="gap-3 px-4 pb-4 pt-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-serif text-lg font-semibold leading-tight">
              {`Notes (${notes.length})`}
            </Text>
            <Button
              size="sm"
              variant="ghost"
              accessibilityLabel="Close all notes"
              onPress={onClose}
            >
              <Text>Close</Text>
            </Button>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} accessibilityLabel="All notes">
            <NotesList notes={notes} armedNoteId={armedNoteId} onDeletePress={onDeletePress} />
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}
