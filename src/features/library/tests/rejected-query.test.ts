import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import {
  categories,
  collections,
  designEvents,
  designs,
  images,
  type Database,
  type LiveReadTable,
} from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import { expectLiveReadReruns } from "@/features/database/testing-live";
import { changeStatus, createDesign, recordDecision } from "@/features/designs";
import { writeImages, type ImageStore } from "@/features/images";
import { createTempImageStore } from "@/features/images/testing";
import { createCategory, createCollection } from "@/features/taxonomy";
import { listRejectedDesigns, rejectedDesignsRead } from "../lib/query";

describe("the Rejected designs live read", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;
  let sourceDirectory: string;
  let store: ImageStore;
  let disposeStore: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
    sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-rejected-images-"));
    ({ store, dispose: disposeStore } = createTempImageStore());
  });

  afterEach(() => {
    dispose();
    disposeStore();
    rmSync(sourceDirectory, { recursive: true, force: true });
  });

  test("keeps its declared default and matches the direct read", () => {
    expect(rejectedDesignsRead.empty).toEqual({ designs: [] });
    expect(rejectedDesignsRead.read(database)).toEqual({ designs: listRejectedDesigns(database) });
  });

  test("re-runs when any table it reads changes", async () => {
    const reason = "The fabric cost too much";
    const sourcePath = join(sourceDirectory, "sketch.jpg");
    writeFileSync(sourcePath, "sketch bytes");

    const writes = new Map<LiveReadTable, (db: Database) => void | Promise<void>>([
      [
        designs,
        (db) => {
          reject(db, "Wool coat", reason, 100);
        },
      ],
      [
        designEvents,
        (db) => {
          const designId = reject(db, "Wool coat", reason, 100);

          recordDecision(
            db,
            designId,
            { reason: "Try the wool blend", potentialImprovements: null },
            200,
          );
        },
      ],
      [
        images,
        async (db) => {
          const designId = reject(db, "Wool coat", reason, 100);

          await writeImages(
            db,
            store,
            designId,
            { kind: "attach", images: [{ sourcePath, kind: "sketch" }] },
            300,
          );
        },
      ],
      [
        categories,
        (db) => {
          createCategory(db, { name: "Knitwear" });
        },
      ],
      [
        collections,
        (db) => {
          createCollection(db, { name: "Spring 2027", year: 2027 });
        },
      ],
    ]);

    for (const [table, write] of writes) {
      await expectLiveReadReruns(rejectedDesignsRead, table, database, write);
    }
  });
});

/** Rejects a design through the Status write, so its latest decision is the rejection. */
function reject(
  database: ReturnType<typeof createTempDatabase>["database"],
  name: string,
  reason: string | null,
  now: number,
): string {
  const design = createDesign(database, { name }, now - 1);

  changeStatus(
    database,
    design.id,
    { status: "rejected", reason, potentialImprovements: null },
    now,
  );

  return design.id;
}

describe("the Rejected designs query", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;
  let sourceDirectory: string;
  let store: ImageStore;
  let disposeStore: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
    sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-rejected-images-"));
    ({ store, dispose: disposeStore } = createTempImageStore());
  });

  afterEach(() => {
    dispose();
    disposeStore();
    rmSync(sourceDirectory, { recursive: true, force: true });
  });

  test("returns only rejected designs", () => {
    reject(database, "Rejected", "Too costly", 10);
    createDesign(database, { name: "Still a concept" }, 20);
    const archived = createDesign(database, { name: "Archived" }, 30);

    changeStatus(database, archived.id, { status: "archived" }, 31);

    expect(listRejectedDesigns(database).map((design) => design.name)).toEqual(["Rejected"]);
  });

  test("excludes soft-deleted designs", () => {
    const removed = reject(database, "Removed", "Too costly", 10);

    reject(database, "Kept", "Too costly", 20);
    database.db.update(designs).set({ deletedAt: 30 }).where(eq(designs.id, removed)).run();

    expect(listRejectedDesigns(database).map((design) => design.name)).toEqual(["Kept"]);
  });

  test("orders designs by their most recent update, newest first", () => {
    reject(database, "Oldest", "Too costly", 10);
    reject(database, "Newest", "Too costly", 30);
    reject(database, "Middle", "Too costly", 20);

    expect(listRejectedDesigns(database).map((design) => design.name)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  test("carries the latest decision’s reason and timestamp", () => {
    const designId = reject(database, "Wool coat", "The fabric cost too much", 20);

    recordDecision(
      database,
      designId,
      { reason: "Try the wool blend", potentialImprovements: null },
      30,
    );

    expect(listRejectedDesigns(database)[0]).toMatchObject({
      id: designId,
      reason: "Try the wool blend",
      decidedAt: 30,
    });
  });

  test("keeps the latest decision when a later Status move records none", () => {
    const designId = reject(database, "Wool coat", "The fabric cost too much", 20);

    changeStatus(database, designId, { status: "approved" }, 30);
    changeStatus(
      database,
      designId,
      { status: "rejected", reason: "Too costly", potentialImprovements: null },
      40,
    );

    expect(listRejectedDesigns(database)[0]).toMatchObject({
      reason: "Too costly",
      decidedAt: 40,
    });
  });

  test("carries an empty reason as null", () => {
    reject(database, "No reason", null, 10);

    expect(listRejectedDesigns(database)[0]).toMatchObject({ reason: null, decidedAt: 10 });
  });

  test("carries the Category and the Collection", () => {
    const category = createCategory(database, { name: "Dress" }, 1);
    const collection = createCollection(database, { name: "Spring 2027", year: 2027 }, 2);
    const design = createDesign(
      database,
      { name: "Wool coat", categoryId: category.id, collectionId: collection.id },
      10,
    );

    changeStatus(
      database,
      design.id,
      { status: "rejected", reason: "Too costly", potentialImprovements: null },
      20,
    );

    expect(listRejectedDesigns(database)[0]).toMatchObject({
      category: "Dress",
      collection: "Spring 2027 (2027)",
    });
  });

  test("carries each design’s derived Cover", async () => {
    const designId = reject(database, "Wool coat", "Too costly", 10);
    const sourcePath = join(sourceDirectory, "final.jpg");

    writeFileSync(sourcePath, "final bytes");
    await writeImages(
      database,
      store,
      designId,
      { kind: "attach", images: [{ sourcePath, kind: "final" }] },
      20,
    );

    expect(listRejectedDesigns(database)[0].cover).toMatchObject({
      designId,
      kind: "final",
      contentHash: createHash("sha256").update("final bytes").digest("hex"),
    });
  });

  test("returns no rows when nothing has been rejected", () => {
    createDesign(database, { name: "Still a concept" }, 10);

    expect(listRejectedDesigns(database)).toEqual([]);
  });

  test("carries a row written before the Decision reader existed", () => {
    const designId = randomUUID();

    database.db
      .insert(designs)
      .values({
        id: designId,
        name: "Legacy rejection",
        status: "rejected",
        searchText: "legacy rejection",
        createdAt: 0,
        updatedAt: 10,
      })
      .run();
    database.db
      .insert(designEvents)
      .values({
        id: randomUUID(),
        designId,
        kind: "decision",
        reason: null,
        potentialImprovements: null,
        diff: JSON.stringify({ status: { from: "concept", to: "rejected" } }),
        createdAt: 5,
      })
      .run();

    expect(listRejectedDesigns(database)[0]).toMatchObject({
      id: designId,
      reason: null,
      decidedAt: 5,
    });
  });
});
