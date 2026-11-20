/**
 * Images — the visual record attached to a Design. It owns the four kinds, the
 * derived Cover, the journey the stages read in, the image store port, the one
 * structural write path, and the reads the Library and Detail consume.
 */
export { coverOf, imageStages } from './lib/images';
export type { Image, ImageStage } from './lib/images';
