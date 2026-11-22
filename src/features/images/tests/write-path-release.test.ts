import { listDesignEvents } from "@/features/history";
import { writeImages } from "@/features/images";
import { listDesignImages, type ImageAttachResult, type ImageRemoveResult } from "../lib/records";
import {
  createWoolCoat,
  database,
  missingSourceFile,
  sourceFile,
  store,
  storeThatCannotRelease,
  storedFiles,
} from "./write-path-fixtures";

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
  expect(storedFiles()).toHaveLength(1);
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
        { sourcePath: missingSourceFile("missing.jpg"), kind: "sketch" },
      ],
    },
    1000,
  );

  expect(result).toEqual({ kind: "store-failed" });
  expect(listDesignImages(database, designId)).toEqual([]);
  expect(listDesignEvents(database, designId)).toEqual([]);
  // The copy that landed could not be released, so it stays behind.
  expect(storedFiles()).toHaveLength(1);
});
