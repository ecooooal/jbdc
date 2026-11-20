import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  categories,
  collections,
  DESIGN_STATUSES,
  designs,
  images,
  type Database,
  type DesignStatus,
  type ImageKind,
  type LiveReadTable,
} from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import { expectLiveReadReruns } from "@/features/database/testing-live";
import { createDesign } from "@/features/designs";
import { writeImages, type ImageStore } from "@/features/images";
import { createTempImageStore } from "@/features/images/testing";
import { libraryDesignsRead, listLibraryDesigns } from "@/features/library";
import { createCategory, createCollection } from "@/features/taxonomy";

type NewDesign = {
  status?: DesignStatus;
  updatedAt?: number;
  deletedAt?: number;
  categoryId?: string;
  collectionId?: string;
};

describe("the Library live read", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;
  let sourceDirectory: string;
  let store: ImageStore;
  let disposeStore: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
    sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-library-images-"));
    ({ store, dispose: disposeStore } = createTempImageStore());
  });

  afterEach(() => {
    dispose();
    disposeStore();
    rmSync(sourceDirectory, { recursive: true, force: true });
  });

  test("keeps its declared default and matches the direct read", () => {
    expect(libraryDesignsRead.empty).toEqual({ designs: [] });
    expect(libraryDesignsRead.read(database)).toEqual({ designs: listLibraryDesigns(database) });
  });

  test("re-runs when any table it reads changes", async () => {
    const sourcePath = join(sourceDirectory, "sketch.jpg");
    writeFileSync(sourcePath, "sketch bytes");

    const writes = new Map<LiveReadTable, (db: Database) => void | Promise<void>>([
      [
        designs,
        (db) => {
          createDesign(db, { name: "Wool coat" });
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
      [
        images,
        async (db) => {
          const designId = createDesign(db, { name: "Wool coat" }, 500).id;

          await writeImages(
            db,
            store,
            designId,
            { kind: "attach", images: [{ sourcePath, kind: "sketch" }] },
            1000,
          );
        },
      ],
    ]);

    for (const [table, write] of writes) {
      await expectLiveReadReruns(libraryDesignsRead, table, database, write);
    }
  });
});

describe("library query", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;
  let sourceDirectory: string;
  let store: ImageStore;
  let disposeStore: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
    sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-library-images-"));
    ({ store, dispose: disposeStore } = createTempImageStore());
  });

  afterEach(() => {
    dispose();
    disposeStore();
    rmSync(sourceDirectory, { recursive: true, force: true });
  });

  async function attachImage(
    designId: string,
    kind: ImageKind,
    name: string,
    bytes: string,
    now: number,
  ) {
    const sourcePath = join(sourceDirectory, name);

    writeFileSync(sourcePath, bytes);
    await writeImages(
      database,
      store,
      designId,
      { kind: "attach", images: [{ sourcePath, kind }] },
      now,
    );
  }

  function insertDesign(name: string, design: NewDesign = {}) {
    const id = randomUUID();
    const updatedAt = design.updatedAt ?? 0;

    database.db
      .insert(designs)
      .values({
        id,
        name,
        status: design.status ?? "concept",
        searchText: name.toLowerCase(),
        createdAt: 0,
        updatedAt,
        deletedAt: design.deletedAt,
        categoryId: design.categoryId,
        collectionId: design.collectionId,
      })
      .run();

    return id;
  }

  test("returns no rows for an empty database", () => {
    expect(listLibraryDesigns(database)).toEqual([]);
  });

  test("excludes soft-deleted, rejected, and archived designs", () => {
    insertDesign("Soft deleted", { deletedAt: 1 });
    insertDesign("Rejected", { status: "rejected" });
    insertDesign("Archived", { status: "archived" });
    insertDesign("Still in development", { status: "in_development" });

    expect(listLibraryDesigns(database).map((design) => design.name)).toEqual([
      "Still in development",
    ]);
  });

  test("includes exactly the Statuses that are neither Rejected nor Archived", () => {
    for (const status of DESIGN_STATUSES) insertDesign(status, { status });

    const statuses = listLibraryDesigns(database).map((design) => design.status);
    const shown = DESIGN_STATUSES.filter(
      (status) => status !== "rejected" && status !== "archived",
    );

    expect([...statuses].sort()).toEqual([...shown].sort());
  });

  test("includes active statuses, most recently updated first", () => {
    insertDesign("Concept", { status: "concept", updatedAt: 10 });
    insertDesign("Produced", { status: "produced", updatedAt: 30 });
    insertDesign("Approved", { status: "approved", updatedAt: 20 });

    expect(listLibraryDesigns(database).map((design) => design.name)).toEqual([
      "Produced",
      "Approved",
      "Concept",
    ]);
  });

  test("returns category and collection names, or null when unset", () => {
    const categoryId = randomUUID();
    const collectionId = randomUUID();

    database.db.insert(categories).values({ id: categoryId, name: "Dress", createdAt: 0 }).run();
    database.db
      .insert(collections)
      .values({ id: collectionId, name: "Spring 2027", year: 2027, createdAt: 0 })
      .run();

    insertDesign("In a collection", { categoryId, collectionId, updatedAt: 40 });
    insertDesign("Bare design", { updatedAt: 50 });

    const [bare, inCollection] = listLibraryDesigns(database);

    expect(bare).toMatchObject({
      name: "Bare design",
      category: null,
      collection: null,
    });
    expect(inCollection).toMatchObject({
      name: "In a collection",
      category: "Dress",
      collection: "Spring 2027 (2027)",
      status: "concept",
    });
  });

  test("shows a Collection carrying a year with the year in its label", () => {
    const collectionId = randomUUID();

    database.db
      .insert(collections)
      .values({ id: collectionId, name: "Spring", year: 2027, createdAt: 0 })
      .run();
    insertDesign("In a collection", { collectionId, updatedAt: 40 });

    expect(listLibraryDesigns(database)[0].collection).toBe("Spring (2027)");
  });

  test("shows a Collection stored without a year by its bare name", () => {
    const collectionId = randomUUID();

    database.db
      .insert(collections)
      .values({ id: collectionId, name: "Spring", year: null, createdAt: 0 })
      .run();
    insertDesign("In a collection", { collectionId, updatedAt: 40 });

    expect(listLibraryDesigns(database)[0].collection).toBe("Spring");
  });

  test("returns each design’s derived Cover, and none for an image-less design", async () => {
    const covered = insertDesign("Covered", { updatedAt: 10 });

    insertDesign("Bare", { updatedAt: 20 });

    await attachImage(covered, "sketch", "sketch.jpg", "sketch bytes", 100);
    await attachImage(covered, "final", "final-old.jpg", "old final bytes", 200);
    await attachImage(covered, "final", "final-new.jpg", "new final bytes", 300);

    const byName = new Map(
      listLibraryDesigns(database).map((design) => [design.name, design] as const),
    );
    const bare = byName.get("Bare");
    const coveredDesign = byName.get("Covered");
    const newestFinal = createHash("sha256").update("new final bytes").digest("hex");

    expect(bare?.cover).toBeNull();
    expect(coveredDesign?.cover).toMatchObject({
      designId: covered,
      kind: "final",
      contentHash: newestFinal,
    });
  });
});
