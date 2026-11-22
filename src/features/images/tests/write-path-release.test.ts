import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { listDesignEvents } from "@/features/history";
import { writeImages } from "@/features/images";
import { createTempImageStore } from "@/features/images/testing";
import type { ImageStore } from "../lib/image-store";
import { listDesignImages, type ImageAttachResult, type ImageRemoveResult } from "../lib/records";

/**
 * A store that cannot release a stored file. The row write is the truth, so an
 * unreleased file is the store's problem: no release may fail the write.
 */

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let storeDirectory: string;
let disposeStore: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-release-sources-"));
  ({ store, directory: storeDirectory, dispose: disposeStore } = createTempImageStore());
});

afterEach(() => {
  dispose();
  disposeStore();
  rmSync(sourceDirectory, { recursive: true, force: true });
});

/** A source file on disk, the way a picked image arrives. */
function sourceFile(name: string, contents: string): string {
  const path = join(sourceDirectory, name);

  writeFileSync(path, contents);

  return path;
}

/** A store that copies for real and always refuses to release a file. */
function storeThatCannotRelease(): ImageStore {
  return {
    copy: (sourcePath) => store.copy(sourcePath),
    remove: () => {
      throw new Error("the store refused to release the file");
    },
    uri: (file) => store.uri(file),
  };
}

function createWoolCoat(): string {
  return createDesign(database, { name: "Wool coat" }, 500).id;
}

test("a removal whose release is refused still stores", async () => {
  const designId = createWoolCoat();

  await writeImages(
    database,
    store,
    designId,
    { kind: "attach", images: [{ sourcePath: sourceFile("final.jpg", "final"), kind: "final" }] },
    1000,
  );

  const [image] = listDesignImages(database, designId);

  const result: ImageRemoveResult = await writeImages(
    database,
    storeThatCannotRelease(),
    designId,
    { kind: "remove", imageId: image.id },
    2000,
  );

  expect(result.kind).toBe("stored");
  expect(listDesignImages(database, designId)).toEqual([]);
  expect(listDesignEvents(database, designId)).toHaveLength(2);
  // The file the store could not delete stays; the removal it answered is stored.
  expect(readdirSync(storeDirectory)).toHaveLength(1);
});

test("a failed copy whose release is refused still answers store-failed", async () => {
  const designId = createWoolCoat();

  const result: ImageAttachResult = await writeImages(
    database,
    storeThatCannotRelease(),
    designId,
    {
      kind: "attach",
      images: [
        { sourcePath: sourceFile("copied.jpg", "copied bytes"), kind: "sketch" },
        { sourcePath: join(sourceDirectory, "missing.jpg"), kind: "sketch" },
      ],
    },
    1000,
  );

  expect(result).toEqual({ kind: "store-failed" });
  expect(listDesignImages(database, designId)).toEqual([]);
  expect(listDesignEvents(database, designId)).toEqual([]);
  // The copy that landed could not be released, so it stays behind.
  expect(readdirSync(storeDirectory)).toHaveLength(1);
});
