import { View } from "react-native";
import { Sheet } from "@/shared/components/sheet";
import { Button } from "@/shared/components/ui/button";
import { Text } from "@/shared/components/ui/text";
import type { ImageNote } from "../lib/images";
import { formatNoteDate } from "./note-date";

/**
 * One note read on its own: its full text and created date, in a paper sheet.
 * It is read-only and has no delete control, because destruction has one home
 * in see-all. The sheet wrapper reports every close; the gallery reducer owns
 * the open note's id.
 */
export function NoteSheet({ note, onClose }: { note: ImageNote | null; onClose: () => void }) {
  return (
    <Sheet open={note !== null} onClose={onClose}>
      {note ? (
        <View testID="note-sheet" className="gap-2 px-4 pb-4 pt-3">
          <Text className="font-serif text-lg font-semibold leading-tight">Note</Text>
          <Text variant="muted" className="font-mono text-xs">
            {formatNoteDate(note.createdAt)}
          </Text>
          <Text>{note.text}</Text>
          <Button
            size="sm"
            variant="ghost"
            className="self-end"
            accessibilityLabel="Close note"
            onPress={onClose}
          >
            <Text>Close</Text>
          </Button>
        </View>
      ) : null}
    </Sheet>
  );
}
