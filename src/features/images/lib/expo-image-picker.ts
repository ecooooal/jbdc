import * as ExpoImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import type { ImagePicker } from "./image-picker";

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

/** The picked files' source paths, or nothing when the owner backed out. */
function sourcesOf(result: ExpoImagePicker.ImagePickerResult): readonly string[] {
  return result.canceled ? [] : result.assets.map((asset) => asset.uri);
}

/**
 * The app adapter for the Image picker port: the system picker, offering the
 * camera and the multi-select library. Mechanical — it asks which source, asks
 * for the camera's permission, and returns what was picked. The kind is the
 * caller's stage, so the picker never asks for one.
 */
export function createExpoImagePicker(): ImagePicker {
  return {
    async pick() {
      const source = await sourceOf();

      if (source === "camera") {
        const permission = await ExpoImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) return [];

        const result = await ExpoImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 1,
        });

        return sourcesOf(result);
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

        return sourcesOf(result);
      }

      return [];
    },
  };
}
