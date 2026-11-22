import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { categories, collections, designs } from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign, getDesign, writeDesign } from "@/features/designs";
import {
  DESIGN_NAME_MAX_LENGTH,
  getDesignDetail,
  type Design,
  type UpdateDesignInput,
} from "../lib/records";
import { listLibraryDesigns } from "@/features/library";
import { createCategory, createCollection } from "@/features/taxonomy";

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

/** The visit's one write path, driven by a fixture for the field tests. */
function updateDesign(
  database: ReturnType<typeof createTempDatabase>["database"],
  designId: string,
  input: UpdateDesignInput,
  now?: number,
): Design | null {
  const result = writeDesign(database, designId, { fields: input }, now);

  return result.kind === "stored" ? result.design : null;
}

describe("design updates", () => {
  function storedSearchText(): string | undefined {
    return database.db.select({ searchText: designs.searchText }).from(designs).get()?.searchText;
  }

  test("persists each editable field and rebuilds search text on every write", () => {
    const oldCategory = createCategory(database, { name: "Dress" });
    const category = createCategory(database, { name: "Knitwear" });
    const collection = createCollection(database, { name: "Spring 2027", year: 2027 });
    const design = createDesign(
      database,
      {
        name: "Silk slip",
        description: "Bias cut",
        categoryId: oldCategory.id,
      },
      10,
    );

    const updated = updateDesign(
      database,
      design.id,
      {
        name: "  Wool coat ",
        description: " Heavy twill ",
        categoryId: category.id,
        collectionId: collection.id,
      },
      20,
    );

    expect(updated).toMatchObject({
      id: design.id,
      name: "Wool coat",
      description: "Heavy twill",
      categoryId: category.id,
      collectionId: collection.id,
      status: "concept",
      createdAt: 10,
      updatedAt: 20,
    });
    expect(getDesignDetail(database, design.id)).toMatchObject({
      name: "Wool coat",
      description: "Heavy twill",
      category: "Knitwear",
      collection: "Spring 2027 (2027)",
    });
    expect(listLibraryDesigns(database)[0]).toMatchObject({
      name: "Wool coat",
      category: "Knitwear",
      collection: "Spring 2027 (2027)",
    });
    expect(storedSearchText()).toBe("wool coat heavy twill knitwear spring 2027");
  });

  test("an identity write rebuilds search text and moves Updated through the write entry point", () => {
    const category = createCategory(database, { name: "Dress" });
    const collection = createCollection(database, { name: "Spring 2027", year: 2027 });
    const design = createDesign(database, { name: "Silk slip", description: "Bias cut" }, 10);

    const updated = updateDesign(
      database,
      design.id,
      {
        name: "Wool coat",
        description: " Heavy twill ",
        categoryId: category.id,
        collectionId: collection.id,
      },
      20,
    );

    expect(updated).toMatchObject({
      name: "Wool coat",
      description: "Heavy twill",
      categoryId: category.id,
      collectionId: collection.id,
      updatedAt: 20,
    });
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 20 });
    expect(storedSearchText()).toBe("wool coat heavy twill dress spring 2027");
  });

  test("a soft-deleted Category and Collection still resolve into search text on an identity write", () => {
    const category = createCategory(database, { name: "Dress" });
    const collection = createCollection(database, { name: "Spring 2027", year: 2027 });
    const design = createDesign(
      database,
      { name: "Silk slip", categoryId: category.id, collectionId: collection.id },
      10,
    );

    database.db
      .update(categories)
      .set({ deletedAt: 15 })
      .where(eq(categories.id, category.id))
      .run();
    database.db
      .update(collections)
      .set({ deletedAt: 15 })
      .where(eq(collections.id, collection.id))
      .run();

    const updated = updateDesign(database, design.id, { description: " Bias cut " }, 20);

    expect(updated).toMatchObject({ updatedAt: 20 });
    expect(storedSearchText()).toBe("silk slip bias cut dress spring 2027");
  });

  test("persists every Specification field and rebuilds search text", () => {
    const design = createDesign(database, { name: "Silk slip" }, 10);

    const updated = updateDesign(
      database,
      design.id,
      {
        silhouette: " Relaxed A-line ",
        neckline: "Wide boat neck",
        sleeveType: "Dropped shoulder",
        garmentDetails: "Concealed side zip",
        sizeRange: "UK 8–16",
        measurements: "Bust 96",
        constructionNotes: "French seams",
      },
      20,
    );

    expect(updated).toMatchObject({
      name: "Silk slip",
      silhouette: "Relaxed A-line",
      neckline: "Wide boat neck",
      sleeveType: "Dropped shoulder",
      garmentDetails: "Concealed side zip",
      sizeRange: "UK 8–16",
      measurements: "Bust 96",
      constructionNotes: "French seams",
      updatedAt: 20,
    });
    expect(getDesign(database, design.id)).toEqual(updated);
    expect(storedSearchText()).toBe(
      "silk slip relaxed a-line wide boat neck dropped shoulder concealed side zip uk 8–16 bust 96 french seams",
    );
  });

  test("persists every Creative direction field and rebuilds search text", () => {
    const design = createDesign(database, { name: "Sunday Afternoon" }, 10);

    const updated = updateDesign(
      database,
      design.id,
      {
        concept: " A slow summer day ",
        mood: "Romantic",
        inspiration: "Summer afternoons",
        intendedFeeling: "Comfortable but elegant",
        audience: "Understated dressers",
        styling: "Sandals",
        palette: "Ivory and cream",
      },
      20,
    );

    expect(updated).toMatchObject({
      name: "Sunday Afternoon",
      concept: "A slow summer day",
      mood: "Romantic",
      inspiration: "Summer afternoons",
      intendedFeeling: "Comfortable but elegant",
      audience: "Understated dressers",
      styling: "Sandals",
      palette: "Ivory and cream",
      updatedAt: 20,
    });
    expect(getDesign(database, design.id)).toEqual(updated);
    expect(storedSearchText()).toBe(
      "sunday afternoon a slow summer day romantic summer afternoons comfortable but elegant understated dressers sandals ivory and cream",
    );
  });

  test("clears a Creative direction field with null or whitespace alone", () => {
    const design = createDesign(
      database,
      { name: "Sunday Afternoon", mood: "Romantic", palette: "Ivory" },
      10,
    );

    expect(updateDesign(database, design.id, { mood: null, palette: "   " }, 20)).toMatchObject({
      mood: null,
      palette: null,
      updatedAt: 20,
    });
  });

  test("an update leaves Creative direction fields it does not name alone", () => {
    const design = createDesign(
      database,
      { name: "Sunday Afternoon", concept: "Slow summer day", palette: "Ivory" },
      10,
    );

    expect(updateDesign(database, design.id, { mood: "Romantic" }, 20)).toMatchObject({
      concept: "Slow summer day",
      palette: "Ivory",
      mood: "Romantic",
      updatedAt: 20,
    });
  });

  test("clears a Specification field with null or whitespace alone", () => {
    const design = createDesign(
      database,
      { name: "Silk slip", neckline: "Wide boat neck", sizeRange: "UK 8–16" },
      10,
    );

    expect(
      updateDesign(database, design.id, { neckline: null, sizeRange: "   " }, 20),
    ).toMatchObject({
      neckline: null,
      sizeRange: null,
      updatedAt: 20,
    });
  });

  test("an update leaves Specification fields it does not name alone", () => {
    const design = createDesign(
      database,
      { name: "Silk slip", silhouette: "Relaxed A-line", measurements: "Bust 96" },
      10,
    );

    expect(updateDesign(database, design.id, { neckline: "Boat neck" }, 20)).toMatchObject({
      silhouette: "Relaxed A-line",
      measurements: "Bust 96",
      neckline: "Boat neck",
      updatedAt: 20,
    });
  });

  test("clears the description, Category, and Collection", () => {
    const category = createCategory(database, { name: "Dress" });
    const collection = createCollection(database, { name: "Resort", year: 2028 });
    const design = createDesign(
      database,
      {
        name: "Silk slip",
        description: "Bias cut",
        categoryId: category.id,
        collectionId: collection.id,
      },
      10,
    );

    expect(
      updateDesign(
        database,
        design.id,
        { description: null, categoryId: null, collectionId: null },
        20,
      ),
    ).toMatchObject({
      name: "Silk slip",
      description: null,
      categoryId: null,
      collectionId: null,
      updatedAt: 20,
    });
    expect(getDesignDetail(database, design.id)).toMatchObject({
      description: null,
      category: null,
      collection: null,
    });
    expect(storedSearchText()).toBe("silk slip");
  });

  test("refuses a blank name and keeps the previous one", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);

    expect(writeDesign(database, design.id, { fields: { name: "   " } }, 20)).toEqual({
      kind: "refused",
      field: "name",
      message: "A design needs a name.",
    });

    expect(getDesign(database, design.id)).toMatchObject({
      name: "Wool coat",
      updatedAt: 10,
    });
  });

  test("accepts the name limit and refuses one character more", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);

    expect(
      updateDesign(database, design.id, { name: "a".repeat(DESIGN_NAME_MAX_LENGTH) }, 20),
    ).toMatchObject({ name: "a".repeat(DESIGN_NAME_MAX_LENGTH) });
    expect(
      writeDesign(
        database,
        design.id,
        { fields: { name: "a".repeat(DESIGN_NAME_MAX_LENGTH + 1) } },
        30,
      ),
    ).toEqual({
      kind: "refused",
      field: "name",
      message: `A design name can be at most ${DESIGN_NAME_MAX_LENGTH} characters.`,
    });
  });

  test("an update that changes nothing leaves the timestamp alone", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);

    expect(updateDesign(database, design.id, { name: " Wool coat " }, 20)).toMatchObject({
      name: "Wool coat",
      updatedAt: 10,
    });
  });

  test("returns null for a design that is unknown or already gone", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);

    database.db.update(designs).set({ deletedAt: 15 }).where(eq(designs.id, design.id)).run();

    expect(updateDesign(database, design.id, { name: "Linen shirt" }, 20)).toBeNull();
    expect(updateDesign(database, randomUUID(), { name: "Linen shirt" }, 20)).toBeNull();
  });
});
