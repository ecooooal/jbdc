import { Image as ExpoImage } from "expo-image";
import { ImageIcon, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { IMAGE_KINDS } from "@/features/database";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { imageKindLabel, type Image as StoredImage, type ImageNote } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";
import type { ViewerEvent } from "../lib/viewer-reducer";

/**
 * The image full-screen, with the two things the owner does here: one pill per
 * kind reclassifies it, and Remove hides behind its one question before the
 * image and its notes go. The notes are read-only; the block under the hero is
 * where they are written. The viewer is the whole screen, so the hero's swipe
 * and the rail wait behind it. The image keeps a bounded area and everything
 * beneath it scrolls, so a long note never pushes the controls out of reach.
 * A removal that did not land leaves the image open and says so beside Remove.
 */
export function ImageViewer({
  image,
  notes,
  confirmingRemoval,
  removeFailed,
  send,
}: {
  image: StoredImage;
  notes: readonly ImageNote[];
  confirmingRemoval: boolean;
  removeFailed: boolean;
  send: (event: ViewerEvent) => void;
}) {
  const uri = useImageUri(image);
  const label = imageKindLabel(image.kind);

  return (
    <Modal visible animationType="fade" onRequestClose={() => send({ type: "viewer-closed" })}>
      <View className="flex-1 bg-black" accessibilityLabel="Image viewer" accessibilityViewIsModal>
        <View className="flex-row items-center justify-between px-4 pt-12">
          <Text className="text-sm font-semibold text-white">{label}</Text>
          <Button
            size="icon"
            variant="ghost"
            accessibilityLabel="Close viewer"
            onPress={() => send({ type: "viewer-closed" })}
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
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 40 }}
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
                    selected ? "border-white bg-white" : "border-white/40",
                  )}
                >
                  <Text
                    className={cn("text-xs font-semibold", selected ? "text-black" : "text-white")}
                  >
                    {imageKindLabel(kind)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Notes
            </Text>
            {notes.length > 0 ? (
              notes.map((note) => (
                <Text key={note.id} className="text-white/80">
                  {note.text}
                </Text>
              ))
            ) : (
              <Text className="text-white/60">No notes on this image.</Text>
            )}
          </View>

          {confirmingRemoval ? (
            <View className="gap-2 rounded-xl bg-white/10 p-3">
              <Text className="text-white">Remove this image and its notes?</Text>
              <View className="flex-row justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
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
            <Text className="text-white/80">The image could not be removed.</Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
