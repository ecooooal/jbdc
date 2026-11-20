/**
 * Images — Expo entry point. The app root mounts the store adapter for every
 * surface that loads an image, and hands the picker adapter to the gallery's
 * plus card. Both are mechanical; the rules live on the driver-free entry.
 */
export { createExpoImagePicker } from "./lib/expo-image-picker";
export { createExpoImageStore } from "./lib/expo-image-store";
