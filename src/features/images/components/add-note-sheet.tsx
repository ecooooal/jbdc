import type { ReactNode } from "react";
import { View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Sheet } from "@/shared/components/sheet";
import { Button } from "@/shared/components/ui/button";
import { Text } from "@/shared/components/ui/text";
import { Textarea } from "@/shared/components/ui/textarea";
import type { GalleryFact, ImageNoteComposer } from "../lib/gallery-reducer";

/**
 * The composer's sheet: Add note opens the current image's draft in a
 * keyboard-aware paper sheet. The draft and its image live in the gallery
 * reducer, so a refusal keeps the words, a stored note closes the sheet, and a
 * drag to the closed detent drops the draft by closing the composer. Save and
 * Cancel only declare the write or the close; this sheet owns no rule.
 */
export function AddNoteSheet({
  composer,
  send,
}: {
  composer: ImageNoteComposer | null;
  send: (fact: GalleryFact) => void;
}) {
  return (
    <Sheet open={composer !== null} onClose={() => send({ type: "image-note-composer-closed" })}>
      {composer ? (
        <KeyboardPadding>
          <View className="gap-3 px-4 pb-4 pt-3">
            <Text className="font-serif text-lg font-semibold leading-tight">Add note</Text>
            <Textarea
              accessibilityLabel="New note"
              placeholder="What did you decide here, and why?"
              numberOfLines={3}
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
                onPress={() => send({ type: "image-note-save-pressed" })}
              >
                <Text>Save note</Text>
              </Button>
            </View>
          </View>
        </KeyboardPadding>
      ) : null}
    </Sheet>
  );
}

/**
 * Lifts the sheet's content by the keyboard's height, so a content detent grows
 * exactly as much as the keyboard covers. The padding runs on the UI thread
 * with the keyboard's own animation; the sheet follows the measured content
 * without adding a second animation of its own.
 */
function KeyboardPadding({ children }: { children: ReactNode }) {
  const { height } = useReanimatedKeyboardAnimation();
  const padding = useAnimatedStyle(() => ({
    paddingBottom: Math.max(-height.get(), 0),
  }));

  return <Animated.View style={padding}>{children}</Animated.View>;
}
