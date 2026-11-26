import { Image as ExpoImage } from "expo-image";
import { X } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Modal, Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
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
 * rule. The image detail is the whole screen, so the pager's swipe and the rail
 * wait behind it. The image keeps a bounded area and everything beneath it
 * scrolls, so a long note never pushes the controls out of reach; the one
 * question grows the end of the page and the view follows it. A removal that
 * did not land leaves the image open and says so beside Remove.
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
  const scroll = useRef<ScrollViewInstance>(null);
  const reduced = useReducedMotion();

  // The question grows the end of the page, so the view follows it to keep the
  // whole block and its answer on screen. Reduced motion arrives on the spot
  // rather than sliding.
  useEffect(() => {
    if (confirmingRemoval) scroll.current?.scrollToEnd({ animated: !reduced });
  }, [confirmingRemoval, reduced]);

  return (
    <Modal visible animationType="fade" onRequestClose={() => send({ type: "detail-closed" })}>
      <View
        className="flex-1 bg-photography"
        accessibilityLabel="Image detail"
        accessibilityViewIsModal
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right", "bottom"]}>
          <View className="flex-row items-center justify-between px-4 py-1">
            <Text className="text-xs font-semibold text-photography-ink/70">{label}</Text>
            <Button
              size="icon"
              variant="ghost"
              className="active:bg-photography-ink/10"
              hitSlop={4}
              accessibilityLabel="Close image detail"
              onPress={() => send({ type: "detail-closed" })}
            >
              <Icon as={X} className="size-5 text-photography-ink" />
            </Button>
          </View>

          <View className="h-1/2 items-center justify-center px-6 py-2">
            {uri ? (
              <ExpoImage
                source={{ uri }}
                accessibilityLabel={`${label} image`}
                contentFit="contain"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <View className="h-full w-full items-center justify-center rounded-md border border-dashed border-photography-ink/40 px-6">
                <Text variant="muted" className="text-center text-photography-ink/60">
                  This image could not be opened.
                </Text>
              </View>
            )}
          </View>

          <ScrollView
            ref={scroll}
            className="flex-1"
            contentContainerClassName="gap-6 px-6 pb-12 pt-6"
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
                    hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}
                    onPress={() => send({ type: "kind-pressed", kind })}
                    className={cn(
                      "justify-center rounded-full border px-3 py-2",
                      selected
                        ? "border-photography-ink bg-photography-ink"
                        : "border-photography-ink/40 active:bg-photography-ink/10",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-semibold",
                        selected ? "text-photography" : "text-photography-ink",
                      )}
                    >
                      {imageKindLabel(kind)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="gap-3">
              <Text className="font-serif text-lg font-semibold leading-tight text-photography-ink">
                {notes.length > 0 ? `Notes (${notes.length})` : "Notes"}
              </Text>
              <NotesList
                notes={notes}
                armedNoteId={armedNoteId}
                onDeletePress={onNoteDeletePress}
                overPhotography
              />
            </View>

            <View className="gap-3 border-t border-photography-ink/15 pt-4">
              {confirmingRemoval ? (
                <View className="gap-3 rounded-xl bg-photography-ink/10 p-4">
                  <Text className="text-photography-ink">Remove this image and its notes?</Text>
                  <View className="flex-row justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="active:bg-photography-ink/20"
                      hitSlop={4}
                      accessibilityLabel="Keep image"
                      onPress={() => send({ type: "remove-cancelled" })}
                    >
                      <Text className="text-photography-ink">Keep</Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      hitSlop={4}
                      accessibilityLabel="Remove image and notes"
                      onPress={() => send({ type: "remove-confirmed" })}
                    >
                      <Text>Remove</Text>
                    </Button>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center gap-3">
                  <Pressable
                    role="button"
                    accessibilityLabel="Remove image"
                    hitSlop={4}
                    onPress={() => send({ type: "remove-pressed" })}
                    className="justify-center rounded-md py-2 active:opacity-60"
                  >
                    <Text className="text-sm font-medium text-destructive-on-photography">
                      Remove image
                    </Text>
                  </Pressable>

                  {removeFailed ? (
                    <Text
                      className="flex-1 text-sm text-destructive-on-photography"
                      accessibilityLiveRegion="polite"
                    >
                      The image could not be removed.
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
