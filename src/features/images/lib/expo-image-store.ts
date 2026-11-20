import { Directory, File, Paths } from "expo-file-system";
import type { ImageFile, ImageStore } from "./image-store";

/** The catalog's own image directory, beside the database in the document directory. */
const IMAGE_DIRECTORY = new Directory(Paths.document, "images");

/** The part of a file's name after its dot; a camera file without one reads as a photo. */
function extensionOf(file: File): string {
  return file.extension.replace(/^\./, "").toLowerCase() || "jpg";
}

function pathOf(file: ImageFile): File {
  return new File(IMAGE_DIRECTORY, `${file.contentHash}.${file.extension}`);
}

/**
 * The app adapter for the Image store port: files live in the catalog's image
 * directory, keyed by the SHA-256 of their bytes. Mechanical, like the database
 * adapters — it hashes, copies and deletes, and the rules it serves stay in the
 * write path. The same bytes answer the same key, so they are stored once.
 */
export function createExpoImageStore(): ImageStore {
  return {
    async copy(sourcePath) {
      const source = new File(sourcePath);
      const file: ImageFile = {
        contentHash: await source.digest("SHA-256"),
        extension: extensionOf(source),
      };
      const destination = pathOf(file);

      if (!destination.exists) {
        IMAGE_DIRECTORY.create({ idempotent: true });
        await source.copy(destination);
      }

      return file;
    },
    remove(file) {
      const stored = pathOf(file);

      if (stored.exists) stored.delete();
    },
    uri(file) {
      return pathOf(file).uri;
    },
  };
}
