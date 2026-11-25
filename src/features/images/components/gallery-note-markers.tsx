import { Pressable, View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import type { NotesIndexView } from "../lib/gallery-reducer";
import type { ImageNote } from "../lib/images";

/**
 * The note markers on the image's right edge, below the counter: one numbered
 * marker per note, oldest first, and a `+N` marker when more notes exist than
 * the four shown. The numbers are the index's derivation, so a removal
 * renumbers the rest without anything stored. A marker opens its note's sheet;
 * the overflow opens see-all.
 */
export function GalleryNoteMarkers({
  view,
  onNotePress,
  onOverflowPress,
}: {
  view: NotesIndexView<ImageNote>;
  onNotePress: (noteId: string) => void;
  onOverflowPress: () => void;
}) {
  if (view.markers.length === 0) return null;

  return (
    <View pointerEvents="box-none" className="absolute right-2 top-14 items-end gap-2">
      {view.markers.map((marker) =>
        marker.kind === "note" ? (
          <Pressable
            key={marker.note.id}
            role="button"
            accessibilityLabel={`Note ${marker.number}`}
            onPress={() => onNotePress(marker.note.id)}
            className="size-7 items-center justify-center rounded-full bg-black/60"
          >
            <Text className="text-xs font-semibold text-white">{marker.number}</Text>
          </Pressable>
        ) : (
          <Pressable
            key="overflow"
            role="button"
            accessibilityLabel={
              marker.count === 1 ? "Show 1 more note" : `Show ${marker.count} more notes`
            }
            onPress={onOverflowPress}
            className="h-7 min-w-7 items-center justify-center rounded-full bg-black/60 px-1.5"
          >
            <Text className="text-xs font-semibold text-white">{`+${marker.count}`}</Text>
          </Pressable>
        ),
      )}
    </View>
  );
}
