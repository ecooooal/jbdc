import { createContext, useContext, type PropsWithChildren } from "react";
import type { ImageFile, ImageStore } from "./image-store";

const ImageStoreContext = createContext<ImageStore | null>(null);

/**
 * Makes the Image store port available to the surfaces that render a Cover.
 * The app supplies the Expo adapter at its root; a surface rendered without a
 * provider shows the placeholder instead, because nothing can be loaded yet.
 */
export function ImageStoreProvider({ store, children }: PropsWithChildren<{ store: ImageStore }>) {
  return <ImageStoreContext.Provider value={store}>{children}</ImageStoreContext.Provider>;
}

/**
 * The URI a stored image is loaded from, or null when no store is provided.
 * A surface that renders a Cover calls this; a design with no image passes
 * null and gets the same placeholder.
 */
export function useImageUri(file: ImageFile | null): string | null {
  const store = useContext(ImageStoreContext);

  return file && store ? store.uri(file) : null;
}
