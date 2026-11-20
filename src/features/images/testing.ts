import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import type { ImageFile, ImageStore } from './lib/image-store';

/**
 * The test adapter for the Image store port: a real temp directory on disk.
 * Copying hashes the bytes with SHA-256 and names the stored file by that hash,
 * so the same bytes are stored once; removing deletes the one file. Suites
 * create one per test and dispose it after.
 */
export function createTempImageStore(): {
  store: ImageStore;
  /** The directory the files are stored in, so a suite can count them. */
  directory: string;
  dispose: () => void;
} {
  const directory = mkdtempSync(join(tmpdir(), 'jbdc-images-'));

  mkdirSync(directory, { recursive: true });

  const pathOf = (file: ImageFile) => join(directory, `${file.contentHash}.${file.extension}`);

  return {
    directory,
    store: {
      copy(sourcePath) {
        const file: ImageFile = {
          contentHash: createHash('sha256').update(readFileSync(sourcePath)).digest('hex'),
          extension: extname(sourcePath).slice(1).toLowerCase(),
        };

        if (!existsSync(pathOf(file))) copyFileSync(sourcePath, pathOf(file));

        return file;
      },
      remove(file) {
        rmSync(pathOf(file), { force: true });
      },
      uri(file) {
        return `file://${pathOf(file)}`;
      },
    },
    dispose: () => rmSync(directory, { recursive: true, force: true }),
  };
}
