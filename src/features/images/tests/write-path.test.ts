import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign, getDesign } from "@/features/designs";
import { coverOf, writeImages } from "@/features/images";
import type { ImageStore } from "../lib/image-store";
import {
  listDesignImages,
  type ImageAttachResult,
  type ImageReclassifyResult,
  type ImageRemoveResult,
} from "../lib/records";
import { createTempImageStore } from "@/features/images/testing";
import { listDesignEvents } from "@/features/history";

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let storeDirectory: string;
let disposeStore: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-image-sources-"));
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

function createWoolCoat(now = 500): string {
  return createDesign(database, { name: "Wool coat" }, now).id;
}

function storedFiles(): string[] {
  return readdirSync(storeDirectory);
}

describe("attaching images", () => {
  test("several at once is one action and records one image_change event", async () => {
    const designId = createWoolCoat();

    const result: ImageAttachResult = await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [
          { sourcePath: sourceFile("front.jpg", "front bytes"), kind: "sketch" },
          { sourcePath: sourceFile("back.jpg", "back bytes"), kind: "sketch" },
        ],
      },
      1000,
    );

    expect(result.kind).toBe("stored");
    expect(listDesignImages(database, designId)).toHaveLength(2);

    const events = listDesignEvents(database, designId);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "image_change",
      createdAt: 1000,
      diff: {
        images: {
          attached: [
            { id: expect.any(String), kind: "sketch", contentHash: expect.any(String) },
            { id: expect.any(String), kind: "sketch", contentHash: expect.any(String) },
          ],
        },
      },
    });
  });

  test("the same file attached twice is stored once", async () => {
    const designId = createWoolCoat();
    const sourcePath = sourceFile("sketch.jpg", "the same bytes");

    await writeImages(
      database,
      store,
      designId,
      { kind: "attach", images: [{ sourcePath, kind: "sketch" }] },
      1000,
    );
    await writeImages(
      database,
      store,
      designId,
      { kind: "attach", images: [{ sourcePath, kind: "final" }] },
      2000,
    );

    const [first, second] = listDesignImages(database, designId);

    expect(first.contentHash).toBe(second.contentHash);
    expect(storedFiles()).toHaveLength(1);
  });

  test("a design with no images has no Cover", async () => {
    const designId = createWoolCoat();

    expect(coverOf(listDesignImages(database, designId))).toBeNull();
  });
});

describe("reclassifying an image", () => {
  test("changes the Cover with no other act", async () => {
    const designId = createWoolCoat();

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [{ sourcePath: sourceFile("sketch.jpg", "sketch"), kind: "sketch" }],
      },
      1000,
    );

    const [image] = listDesignImages(database, designId);

    expect(coverOf(listDesignImages(database, designId))).toMatchObject({ kind: "sketch" });

    await writeImages(
      database,
      store,
      designId,
      { kind: "reclassify", imageId: image.id, to: "final" },
      2000,
    );

    expect(coverOf(listDesignImages(database, designId))).toMatchObject({
      id: image.id,
      kind: "final",
    });
  });

  test("records one image_change event carrying what it was and what it became", async () => {
    const designId = createWoolCoat();

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [{ sourcePath: sourceFile("sketch.jpg", "sketch"), kind: "sketch" }],
      },
      1000,
    );

    const [image] = listDesignImages(database, designId);

    await writeImages(
      database,
      store,
      designId,
      { kind: "reclassify", imageId: image.id, to: "prototype" },
      2000,
    );

    const events = listDesignEvents(database, designId);
    const reclassified = events.filter((event) => event.kind === "image_change");

    expect(reclassified).toHaveLength(2);
    expect(reclassified[0]).toMatchObject({
      diff: {
        images: {
          reclassified: [{ from: { kind: "sketch" }, to: { kind: "prototype" } }],
        },
      },
    });
  });

  test("to the kind it already has stores nothing and records nothing", async () => {
    const designId = createWoolCoat();

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [{ sourcePath: sourceFile("sketch.jpg", "sketch"), kind: "sketch" }],
      },
      1000,
    );

    const [image] = listDesignImages(database, designId);

    const result: ImageReclassifyResult = await writeImages(
      database,
      store,
      designId,
      { kind: "reclassify", imageId: image.id, to: "sketch" },
      2000,
    );

    expect(result).toEqual({
      kind: "stored",
      images: [image],
      event: null,
    });
    expect(listDesignEvents(database, designId)).toHaveLength(1);
    expect(getDesign(database, designId)?.updatedAt).toBe(1000);
  });
});

describe("removing an image", () => {
  test("garbage-collects the stored file when its last reference goes", async () => {
    const designId = createWoolCoat();
    const sourcePath = sourceFile("final.jpg", "the same bytes");

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [
          { sourcePath, kind: "final" },
          { sourcePath, kind: "sketch" },
        ],
      },
      1000,
    );

    const [first, second] = listDesignImages(database, designId);

    await writeImages(database, store, designId, { kind: "remove", imageId: first.id }, 2000);

    expect(storedFiles()).toHaveLength(1);

    await writeImages(database, store, designId, { kind: "remove", imageId: second.id }, 3000);

    expect(storedFiles()).toHaveLength(0);
    expect(listDesignImages(database, designId)).toEqual([]);
    expect(listDesignEvents(database, designId).map((event) => event.kind)).toEqual([
      "image_change",
      "image_change",
      "image_change",
    ]);
  });

  test("counts references by bytes and extension, so a sibling extension survives", async () => {
    const designId = createWoolCoat();
    const jpeg = sourceFile("a.jpg", "the same bytes");
    const png = sourceFile("a.png", "the same bytes");

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [
          { sourcePath: jpeg, kind: "final" },
          { sourcePath: png, kind: "sketch" },
        ],
      },
      1000,
    );

    const images = listDesignImages(database, designId);
    const jpegImage = images.find((image) => image.extension === "jpg");
    const pngImage = images.find((image) => image.extension === "png");

    expect(jpegImage?.contentHash).toBe(pngImage?.contentHash);
    expect(storedFiles().sort()).toEqual([
      `${pngImage?.contentHash}.jpg`,
      `${pngImage?.contentHash}.png`,
    ]);

    await writeImages(database, store, designId, { kind: "remove", imageId: jpegImage!.id }, 2000);

    expect(storedFiles()).toEqual([`${pngImage!.contentHash}.png`]);

    await writeImages(database, store, designId, { kind: "remove", imageId: pngImage!.id }, 3000);

    expect(storedFiles()).toEqual([]);
  });

  test("keeps a file another design still references", async () => {
    const firstDesign = createWoolCoat();
    const secondDesign = createDesign(database, { name: "Silk slip" }, 500).id;
    const sourcePath = sourceFile("shared.jpg", "shared bytes");

    await writeImages(
      database,
      store,
      firstDesign,
      { kind: "attach", images: [{ sourcePath, kind: "final" }] },
      1000,
    );
    await writeImages(
      database,
      store,
      secondDesign,
      { kind: "attach", images: [{ sourcePath, kind: "sketch" }] },
      1100,
    );

    const [image] = listDesignImages(database, firstDesign);

    await writeImages(database, store, firstDesign, { kind: "remove", imageId: image.id }, 2000);

    expect(storedFiles()).toHaveLength(1);
    expect(listDesignImages(database, secondDesign)).toHaveLength(1);
  });
});

describe("the moved updatedAt", () => {
  test("every structural write moves it in the same transaction", async () => {
    const designId = createWoolCoat(500);

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [{ sourcePath: sourceFile("sketch.jpg", "sketch"), kind: "sketch" }],
      },
      1000,
    );
    expect(getDesign(database, designId)?.updatedAt).toBe(1000);

    const [image] = listDesignImages(database, designId);

    await writeImages(
      database,
      store,
      designId,
      { kind: "reclassify", imageId: image.id, to: "final" },
      2000,
    );
    expect(getDesign(database, designId)?.updatedAt).toBe(2000);

    await writeImages(database, store, designId, { kind: "remove", imageId: image.id }, 3000);
    expect(getDesign(database, designId)?.updatedAt).toBe(3000);
  });
});

describe("refused writes", () => {
  test("an attach with no images is refused and stores nothing", async () => {
    const designId = createWoolCoat(500);

    expect(
      await writeImages(database, store, designId, { kind: "attach", images: [] }, 1000),
    ).toEqual({
      kind: "refused",
      field: "images",
      message: "Choose at least one image.",
    });

    expect(listDesignImages(database, designId)).toEqual([]);
    expect(listDesignEvents(database, designId)).toEqual([]);
    expect(storedFiles()).toEqual([]);
    expect(getDesign(database, designId)?.updatedAt).toBe(500);
  });

  test("a kind outside the four is refused", async () => {
    const designId = createWoolCoat();

    const result = await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [{ sourcePath: sourceFile("swatch.jpg", "swatch"), kind: "material" as never }],
      },
      1000,
    );

    expect(result).toEqual({
      kind: "refused",
      field: "kind",
      message: "An image needs one of the four kinds.",
    });
    expect(listDesignImages(database, designId)).toEqual([]);
  });

  test("a write against a design that is gone answers design-missing", async () => {
    expect(
      await writeImages(
        database,
        store,
        "no-such-design",
        {
          kind: "attach",
          images: [{ sourcePath: sourceFile("sketch.jpg", "sketch"), kind: "sketch" }],
        },
        1000,
      ),
    ).toEqual({ kind: "design-missing" });
    expect(storedFiles()).toEqual([]);
  });

  test("a copy that fails answers store-failed and releases what this attempt stored", async () => {
    const designId = createWoolCoat(500);
    const copied = sourceFile("copied.jpg", "copied bytes");

    const result: ImageAttachResult = await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [
          { sourcePath: copied, kind: "sketch" },
          { sourcePath: join(sourceDirectory, "missing.jpg"), kind: "sketch" },
        ],
      },
      1000,
    );

    expect(result).toEqual({ kind: "store-failed" });
    expect(storedFiles()).toEqual([]);
    expect(listDesignImages(database, designId)).toEqual([]);
    expect(listDesignEvents(database, designId)).toEqual([]);
    expect(getDesign(database, designId)?.updatedAt).toBe(500);
  });

  test("a failed copy leaves a file another image still references", async () => {
    const designId = createWoolCoat(500);
    const shared = sourceFile("shared.jpg", "shared bytes");

    await writeImages(
      database,
      store,
      designId,
      { kind: "attach", images: [{ sourcePath: shared, kind: "final" }] },
      1000,
    );

    expect(
      await writeImages(
        database,
        store,
        designId,
        {
          kind: "attach",
          images: [
            { sourcePath: shared, kind: "sketch" },
            { sourcePath: join(sourceDirectory, "missing.jpg"), kind: "sketch" },
          ],
        },
        2000,
      ),
    ).toEqual({ kind: "store-failed" });

    expect(storedFiles()).toHaveLength(1);
    expect(listDesignImages(database, designId)).toHaveLength(1);
  });

  test("a structural write with no store answers store-failed and stores nothing", async () => {
    const designId = createWoolCoat(500);

    expect(
      await writeImages(
        database,
        null,
        designId,
        {
          kind: "attach",
          images: [{ sourcePath: sourceFile("sketch.jpg", "sketch"), kind: "sketch" }],
        },
        1000,
      ),
    ).toEqual({ kind: "store-failed" });

    expect(listDesignImages(database, designId)).toEqual([]);
    expect(listDesignEvents(database, designId)).toEqual([]);
    expect(storedFiles()).toEqual([]);
    expect(getDesign(database, designId)?.updatedAt).toBe(500);
  });

  test("a removal with no store answers store-failed and keeps the image", async () => {
    const designId = createWoolCoat(500);

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [{ sourcePath: sourceFile("sketch.jpg", "sketch"), kind: "sketch" }],
      },
      1000,
    );

    const [image] = listDesignImages(database, designId);

    const result: ImageRemoveResult = await writeImages(
      database,
      null,
      designId,
      { kind: "remove", imageId: image.id },
      2000,
    );

    expect(result).toEqual({ kind: "store-failed" });
    expect(listDesignImages(database, designId)).toEqual([image]);
    expect(listDesignEvents(database, designId)).toHaveLength(1);
    expect(storedFiles()).toHaveLength(1);
  });

  test("reclassifying an image the design does not have answers image-missing", async () => {
    const designId = createWoolCoat();

    expect(
      await writeImages(
        database,
        store,
        designId,
        { kind: "reclassify", imageId: "ghost", to: "final" },
        1000,
      ),
    ).toEqual({ kind: "image-missing", imageId: "ghost" });
  });

  test("removing an image the design does not have answers image-missing", async () => {
    const designId = createWoolCoat();

    expect(
      await writeImages(database, store, designId, { kind: "remove", imageId: "ghost" }, 1000),
    ).toEqual({ kind: "image-missing", imageId: "ghost" });
  });

  test("an image is reached only through the design it belongs to", async () => {
    const firstDesign = createWoolCoat();
    const secondDesign = createDesign(database, { name: "Silk slip" }, 500).id;

    await writeImages(
      database,
      store,
      firstDesign,
      { kind: "attach", images: [{ sourcePath: sourceFile("final.jpg", "final"), kind: "final" }] },
      1000,
    );

    const [image] = listDesignImages(database, firstDesign);

    expect(
      await writeImages(database, store, secondDesign, { kind: "remove", imageId: image.id }, 2000),
    ).toEqual({ kind: "image-missing", imageId: image.id });
    expect(listDesignImages(database, firstDesign)).toHaveLength(1);
    expect(storedFiles()).toHaveLength(1);
  });
});
