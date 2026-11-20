import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { images } from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import { expectLiveReadReruns } from "@/features/database/testing-live";
import { createDesign } from "@/features/designs";
import {
  designImagesRead,
  listDesignImages,
  writeImages,
  type ImageStore,
} from "@/features/images";
import { createTempImageStore } from "@/features/images/testing";

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let disposeStore: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-gallery-sources-"));
  ({ store, dispose: disposeStore } = createTempImageStore());
});

afterEach(() => {
  dispose();
  disposeStore();
  rmSync(sourceDirectory, { recursive: true, force: true });
});

function sourceFile(name: string, contents: string): string {
  const path = join(sourceDirectory, name);

  writeFileSync(path, contents);

  return path;
}

describe("the Design images live read", () => {
  test("keeps its declared default and matches the direct read", () => {
    const design = createDesign(database, { name: "Wool coat" });
    const declaration = designImagesRead(design.id);

    expect(declaration.empty).toEqual({ images: [] });
    expect(declaration.read(database)).toEqual({
      images: listDesignImages(database, design.id),
    });
  });

  test("re-runs when the images table changes", async () => {
    const design = createDesign(database, { name: "Wool coat" });

    await expectLiveReadReruns(designImagesRead(design.id), images, database, (db) => {
      writeImages(
        db,
        store,
        design.id,
        {
          kind: "attach",
          images: [{ sourcePath: sourceFile("sketch.jpg", "sketch bytes"), kind: "sketch" }],
        },
        1000,
      );
    });
  });
});
