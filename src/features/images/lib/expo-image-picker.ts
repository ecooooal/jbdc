import * as ExpoImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import type { ImagePicker, ImagePickResult } from "./image-picker";

type Source = "camera" | "library";

/** Which way the owner is attaching: the camera, the library, or neither. */
function sourceOf(): Promise<Source | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Add images",
      undefined,
      [
        { text: "Take photo", onPress: () => resolve("camera") },
        { text: "Choose from library", onPress: () => resolve("library") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/**
 * The picked files, or the fact the owner backed out of the system picker. A
 * success carrying no files is a cancel: nothing was chosen, so there is
 * nothing to report as an attach.
 */
function pickResultOf(result: ExpoImagePicker.ImagePickerResult): ImagePickResult {
  return result.canceled || result.assets.length === 0
    ? { kind: "cancelled" }
    : { kind: "picked", sourcePaths: result.assets.map((asset) => asset.uri) };
}

/**
 * The app adapter for the Image picker port: the system picker, offering the
 * camera and the multi-select library. Mechanical — it asks which source, asks
 * for the camera's permission, and answers what happened. A refused permission
 * is a denial, not a cancel, so the caller can tell the owner. The kind is the
 * caller's stage, so the picker never asks for one.
 */
export function createExpoImagePicker(): ImagePicker {
  return {
    async pick() {
      const source = await sourceOf();

      if (source === "camera") {
        const permission = await ExpoImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) return { kind: "denied" };

        const result = await ExpoImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 1,
        });

        return pickResultOf(result);
      }

      if (source === "library") {
        // The library picker needs no permission of its own; iOS asks when an
        // original has to be downloaded, using the configured string.
        const result = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: true,
          selectionLimit: 0,
          quality: 1,
        });

        return pickResultOf(result);
      }

      return { kind: "cancelled" };
    },
  };
}
