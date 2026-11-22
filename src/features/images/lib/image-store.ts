/**
 * The key a stored image file answers to: the content hash the file was stored
 * under, and the extension it is read with. Two attaches of the same bytes
 * produce the same key, which is what makes the store store them once.
 */
export type ImageFile = {
  /** SHA-256 of the file's bytes, hex-encoded. */
  contentHash: string;
  /** The file's extension, without the dot. */
  extension: string;
};

/**
 * The Image store port: where an image's bytes live, outside the catalog.
 * Mechanical adapters (the Expo one in the app, a temp directory in tests) copy
 * files in, delete them, and say where the app loads one from. The database
 * stays the catalog of record and holds only the key.
 */
export interface ImageStore {
  /**
   * Copies a source file into the catalog's image directory, keyed by its
   * content hash. Copying the same bytes again stores them once and answers the
   * same key. Reading the bytes to hash them is why this is the one async
   * operation on the port.
   */
  copy(sourcePath: string): Promise<ImageFile>;
  /** Deletes a stored file. A file that is already gone is not an error. */
  remove(file: ImageFile): void;
  /** The URI the app loads a stored file from. */
  uri(file: ImageFile): string;
}
