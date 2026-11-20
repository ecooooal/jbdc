/**
 * Images — React entry point. Detail composes the gallery from here, and every
 * surface that renders an image reads its URI through the store context; the
 * kinds, the Cover, and the write path stay on the driver-free entry.
 */
export { DesignGallery } from "./components/design-gallery";
export { ImageStoreProvider, useImageUri } from "./lib/image-store-context";
