import { Image as ExpoImage } from "expo-image";
import { ImageIcon, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IMAGE_KINDS } from "@/features/database";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { imageKindLabel, type Image as StoredImage, type ImageNote } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";
import type { ImageDetailEvent } from "../lib/image-detail-reducer";
import { NotesList } from "./notes-list";

/**
 * The image detail, full-screen on the black photography surface, with the two
 * things the owner does here: one pill per kind reclassifies it, and Remove
 * hides behind its one question before the image and its notes go. The notes
 * list is the same read-only list as the notes sheet, with the same two-step
 * delete; its presses go to the gallery reducer, which owns the one arming
 * rule. The
 * image detail is the whole screen, so the pager's swipe and the rail wait
 * behind it. The image keeps a bounded area and everything beneath it scrolls,
 * so a long note never pushes the controls out of reach. A removal that did
 * not land leaves the image open and says so beside Remove.
 */
export function ImageDetail({
  image,
  notes,
  armedNoteId,
  confirmingRemoval,
  removeFailed,
  send,
  onNoteDeletePress,
}: {
  image: StoredImage;
  notes: readonly ImageNote[];
  armedNoteId: string | null;
  confirmingRemoval: boolean;
  removeFailed: boolean;
  send: (event: ImageDetailEvent) => void;
  onNoteDeletePress: (noteId: string) => void;
}) {
  const uri = useImageUri(image);
  const label = imageKindLabel(image.kind);

  return (
    <Modal visible animationType="fade" onRequestClose={() => send({ type: "detail-closed" })}>
      <View className="flex-1 bg-black" accessibilityLabel="Image detail" accessibilityViewIsModal>
        <SafeAreaView className="flex-1" edges={["top", "left", "right", "bottom"]}>
          <View className="flex-row items-center justify-between px-4 py-1">
            <Text className="text-xs font-semibold text-white/70">{label}</Text>
            <Button
              size="icon"
              variant="ghost"
              className="active:bg-white/10"
              accessibilityLabel="Close image detail"
              onPress={() => send({ type: "detail-closed" })}
            >
              <Icon as={X} className="size-5 text-white" />
            </Button>
          </View>

          <View className="h-1/2 items-center justify-center px-2">
            {uri ? (
              <ExpoImage
                source={{ uri }}
                accessibilityLabel={`${label} image`}
                contentFit="contain"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Icon as={ImageIcon} className="size-10 text-white/40" />
            )}
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ gap: 16, paddingHorizontal: 24, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-row flex-wrap gap-2">
              {IMAGE_KINDS.map((kind) => {
                const selected = kind === image.kind;

                return (
                  <Pressable
                    key={kind}
                    role="button"
                    accessibilityLabel={`Classify as ${imageKindLabel(kind)}`}
                    accessibilityState={{ selected }}
                    onPress={() => send({ type: "kind-pressed", kind })}
                    className={cn(
                      "rounded-full border px-3 py-1",
                      selected ? "border-white bg-white" : "border-white/40 active:bg-white/10",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-semibold",
                        selected ? "text-black" : "text-white",
                      )}
                    >
                      {imageKindLabel(kind)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="gap-2">
              <Text className="font-serif text-lg font-semibold leading-tight text-white">
                {notes.length > 0 ? `Notes (${notes.length})` : "Notes"}
              </Text>
              <NotesList
                notes={notes}
                armedNoteId={armedNoteId}
                onDeletePress={onNoteDeletePress}
                overPhotography
              />
            </View>

            <View className="gap-2 border-t border-white/15 pt-4">
              {confirmingRemoval ? (
                <View className="gap-2 rounded-xl bg-white/10 p-3">
                  <Text className="text-white">Remove this image and its notes?</Text>
                  <View className="flex-row justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="active:bg-white/10"
                      accessibilityLabel="Keep image"
                      onPress={() => send({ type: "remove-cancelled" })}
                    >
                      <Text className="text-white">Keep</Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      accessibilityLabel="Remove image and notes"
                      onPress={() => send({ type: "remove-confirmed" })}
                    >
                      <Text>Remove</Text>
                    </Button>
                  </View>
                </View>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  className="self-start"
                  accessibilityLabel="Remove image"
                  onPress={() => send({ type: "remove-pressed" })}
                >
                  <Text>Remove image</Text>
                </Button>
              )}

              {removeFailed ? (
                <Text className="text-destructive text-sm">The image could not be removed.</Text>
              ) : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
