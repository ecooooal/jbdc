/**
 * Images — the visual record attached to a Design. It owns the four kinds, the
 * derived Cover, the journey the stages read in, the image store port, the one
 * image write path, and the reads the Library and Detail consume.
 */
export { coverOf } from "./lib/images";
export type { Image } from "./lib/images";
export { writeImages } from "./lib/records";
export type { ImageStore } from "./lib/image-store";
