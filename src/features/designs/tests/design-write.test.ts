import { eq } from "drizzle-orm";
import { designs } from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import {
  createDesign,
  getDesign,
  listMaterialUses,
  writeDesign,
  type ChangeOutcome,
  type DesignWriteResult,
  type MaterialUse,
} from "@/features/designs";
import { createMaterial } from "@/features/materials";

function storedSearchText(database: ReturnType<typeof createTempDatabase>["database"]): string {
  return database.db.select({ searchText: designs.searchText }).from(designs).get()!.searchText;
}

/** The stored answer, which every test but the refusals expects. */
function stored(result: DesignWriteResult): Extract<DesignWriteResult, { kind: "stored" }> {
  if (result.kind !== "stored") throw new Error(`expected a stored write, got ${result.kind}`);

  return result;
}

/** The one use an add outcome stored. */
function addedUse(outcomes: readonly ChangeOutcome[]): MaterialUse {
  const [outcome] = outcomes;

  if (outcome?.kind !== "add") throw new Error("expected one add outcome");

  return outcome.materialUse;
}

describe("one Design write", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test("a refused colour stores neither the row nor its search text", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);
    const wool = createMaterial(database, { name: "Wool" });

    expect(
      writeDesign(
        database,
        design.id,
        {
          fields: { name: "Linen shirt" },
          uses: [{ kind: "add", input: { materialId: wool.id, colour: "   ", role: "main" } }],
        },
        20,
      ),
    ).toEqual({
      kind: "refused",
      field: "colour",
      message: "A material use needs a colour.",
    });

    // A refused write stored neither the row nor its rebuilt search text.
    expect(getDesign(database, design.id)).toMatchObject({ name: "Wool coat", updatedAt: 10 });
    expect(storedSearchText(database)).toBe("wool coat");
  });

  test("a refused name answers instead of throwing", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);

    expect(writeDesign(database, design.id, { fields: { name: "   " } }, 20)).toEqual({
      kind: "refused",
      field: "name",
      message: "A design needs a name.",
    });
    expect(getDesign(database, design.id)).toMatchObject({ name: "Wool coat", updatedAt: 10 });
  });

  test("applies field and Material use changes in one write and rebuilds search text once", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);
    const wool = createMaterial(database, { name: "Wool" });
    const silk = createMaterial(database, { name: "Silk crêpe" });
    const first = addedUse(
      stored(
        writeDesign(
          database,
          design.id,
          {
            uses: [
              { kind: "add", input: { materialId: wool.id, colour: "Charcoal", role: "main" } },
            ],
          },
          20,
        ),
      ).outcomes,
    );

    const result = stored(
      writeDesign(
        database,
        design.id,
        {
          fields: { description: "Heavy twill" },
          uses: [
            { kind: "correct", useId: first.id, patch: { materialId: silk.id } },
            { kind: "add", input: { materialId: wool.id, colour: "Black", role: "other" } },
          ],
        },
        30,
      ),
    );

    expect(result.design).toMatchObject({
      name: "Wool coat",
      description: "Heavy twill",
      updatedAt: 30,
    });
    // One outcome per declared change, in the order declared.
    expect(result.outcomes.map((outcome) => outcome.kind)).toEqual(["fields", "correct", "add"]);
    expect(result.outcomes[1]).toMatchObject({
      kind: "correct",
      materialUse: { materialName: "Silk crêpe" },
    });
    expect(result.outcomes[2]).toMatchObject({
      kind: "add",
      materialUse: { materialName: "Wool", colour: "Black" },
    });
    expect(storedSearchText(database)).toBe("wool coat heavy twill silk crêpe charcoal wool black");
    expect(listMaterialUses(database, design.id)).toHaveLength(2);
  });

  test("a write that changes nothing leaves the row and its search text alone", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);
    const wool = createMaterial(database, { name: "Wool" });
    const first = addedUse(
      stored(
        writeDesign(
          database,
          design.id,
          {
            uses: [
              { kind: "add", input: { materialId: wool.id, colour: "Charcoal", role: "main" } },
            ],
          },
          20,
        ),
      ).outcomes,
    );

    const result = stored(
      writeDesign(
        database,
        design.id,
        {
          fields: { name: " Wool coat " },
          uses: [{ kind: "correct", useId: first.id, patch: { colour: "Charcoal" } }],
        },
        30,
      ),
    );

    expect(result.design).toMatchObject({ name: "Wool coat", updatedAt: 20 });
    // The answer still names every declared change.
    expect(result.outcomes.map((outcome) => outcome.kind)).toEqual(["fields", "correct"]);
    expect(storedSearchText(database)).toBe("wool coat wool charcoal");
  });

  test("removing a use reports the removed use and rebuilds search text", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);
    const wool = createMaterial(database, { name: "Wool" });
    const first = addedUse(
      stored(
        writeDesign(
          database,
          design.id,
          {
            uses: [
              { kind: "add", input: { materialId: wool.id, colour: "Charcoal", role: "main" } },
            ],
          },
          20,
        ),
      ).outcomes,
    );

    const result = stored(
      writeDesign(database, design.id, { uses: [{ kind: "remove", useId: first.id }] }, 30),
    );

    expect(result.outcomes).toEqual([
      {
        kind: "remove",
        materialUse: expect.objectContaining({ id: first.id, materialName: "Wool" }),
      },
    ]);
    expect(storedSearchText(database)).toBe("wool coat");
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 30 });
  });

  test("a use that is no longer stored answers use-missing in its declared place", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);
    const wool = createMaterial(database, { name: "Wool" });
    const first = addedUse(
      stored(
        writeDesign(
          database,
          design.id,
          {
            uses: [
              { kind: "add", input: { materialId: wool.id, colour: "Charcoal", role: "main" } },
            ],
          },
          20,
        ),
      ).outcomes,
    );

    const result = stored(
      writeDesign(
        database,
        design.id,
        {
          fields: { description: "Heavy twill" },
          uses: [
            { kind: "correct", useId: "use-gone", patch: { colour: "Black" } },
            { kind: "remove", useId: first.id },
          ],
        },
        30,
      ),
    );

    expect(result.outcomes).toEqual([
      { kind: "fields", design: expect.objectContaining({ description: "Heavy twill" }) },
      { kind: "use-missing", useId: "use-gone" },
      { kind: "remove", materialUse: expect.objectContaining({ id: first.id }) },
    ]);
    expect(listMaterialUses(database, design.id)).toEqual([]);
  });

  test("answers design-missing when the Design row is no longer in the catalog", () => {
    const design = createDesign(database, { name: "Wool coat" }, 10);
    const wool = createMaterial(database, { name: "Wool" });
    database.db.update(designs).set({ deletedAt: 15 }).where(eq(designs.id, design.id)).run();

    expect(writeDesign(database, design.id, { fields: { name: "Linen shirt" } }, 20)).toEqual({
      kind: "design-missing",
    });

    // A missing row is named as such even when the changes would have been
    // refused: a refusal is about a row that exists.
    expect(writeDesign(database, design.id, { fields: { name: "   " } }, 20)).toEqual({
      kind: "design-missing",
    });
    expect(
      writeDesign(
        database,
        design.id,
        { uses: [{ kind: "add", input: { materialId: wool.id, colour: "   ", role: "main" } }] },
        20,
      ),
    ).toEqual({ kind: "design-missing" });
  });
});
