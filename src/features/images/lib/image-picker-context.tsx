import { createContext, useContext, type PropsWithChildren } from "react";
import type { ImagePicker } from "./image-picker";

const ImagePickerContext = createContext<ImagePicker | null>(null);

/**
 * Makes the Image picker port available to the surfaces that attach images.
 * The app supplies the Expo adapter at its root; a surface rendered without a
 * provider cannot pick, so its add affordance does nothing.
 */
export function ImagePickerProvider({
  picker,
  children,
}: PropsWithChildren<{ picker: ImagePicker }>) {
  return <ImagePickerContext.Provider value={picker}>{children}</ImagePickerContext.Provider>;
}

/** The picker the surface should open, or null when no provider is above it. */
export function useImagePicker(): ImagePicker | null {
  return useContext(ImagePickerContext);
}
