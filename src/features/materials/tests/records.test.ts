import { eq } from "drizzle-orm";
import { materials, type Database, type LiveReadTable } from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import { expectLiveReadReruns } from "@/features/database/testing-live";
import {
  createMaterial,
  InvalidMaterialNameError,
  listMaterials,
  MATERIAL_NAME_MAX_LENGTH,
  materialsRead,
  readMaterialNames,
} from "@/features/materials";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("the Materials live read", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test("keeps its declared default and matches the direct read", () => {
    createMaterial(database, { name: "Silk crêpe" });

    expect(materialsRead.empty).toEqual({ materials: [] });
    expect(materialsRead.read(database)).toEqual({ materials: listMaterials(database) });
  });

  test("re-runs when the Material list changes", async () => {
    const writes = new Map<LiveReadTable, (db: Database) => void>([
      [materials, (db) => createMaterial(db, { name: "Silk crêpe" })],
    ]);

    for (const [table, write] of writes) {
      await expectLiveReadReruns(materialsRead, table, database, write);
    }
  });
});

describe("material records", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test("starts empty: Materials have no seed", () => {
    expect(listMaterials(database)).toEqual([]);
  });

  test("creates a Material with its name trimmed and returns it ready to select", () => {
    const material = createMaterial(database, { name: "  Silk crêpe  " });

    expect(material.name).toBe("Silk crêpe");
    expect(material.id).toMatch(UUID_V4);
    expect(listMaterials(database)).toEqual([material]);
  });

  test("lists Materials alphabetically", () => {
    createMaterial(database, { name: "Linen" });
    createMaterial(database, { name: "Cotton poplin" });

    expect(listMaterials(database).map((material) => material.name)).toEqual([
      "Cotton poplin",
      "Linen",
    ]);
  });

  test("refuses a blank name without writing", () => {
    expect(() => createMaterial(database, { name: " \n\t " })).toThrow(InvalidMaterialNameError);

    expect(listMaterials(database)).toEqual([]);
  });

  test("refuses an exact duplicate name without writing", () => {
    createMaterial(database, { name: "Silk crêpe" });

    expect(() => createMaterial(database, { name: "  Silk crêpe  " })).toThrow(
      InvalidMaterialNameError,
    );
    expect(listMaterials(database)).toHaveLength(1);
  });

  test("refuses a name longer than the limit and accepts the boundary", () => {
    expect(() =>
      createMaterial(database, { name: "a".repeat(MATERIAL_NAME_MAX_LENGTH + 1) }),
    ).toThrow(InvalidMaterialNameError);
    expect(listMaterials(database)).toEqual([]);

    const boundary = createMaterial(database, { name: "a".repeat(MATERIAL_NAME_MAX_LENGTH) });

    expect(boundary.name).toHaveLength(MATERIAL_NAME_MAX_LENGTH);
  });

  test("a soft-deleted Material leaves the picker but keeps its name for an old use", () => {
    const material = createMaterial(database, { name: "Silk crêpe" });

    database.db.update(materials).set({ deletedAt: 10 }).where(eq(materials.id, material.id)).run();

    expect(listMaterials(database)).toEqual([]);
    expect(readMaterialNames(database).get(material.id)).toBe("Silk crêpe");
  });

  test("a name removed from the list is restored rather than added twice", () => {
    const removed = createMaterial(database, { name: "Silk crêpe" });
    database.db.update(materials).set({ deletedAt: 10 }).where(eq(materials.id, removed.id)).run();

    const restored = createMaterial(database, { name: "Silk crêpe" });

    expect(restored).toEqual(removed);
    expect(listMaterials(database)).toEqual([restored]);
    expect(readMaterialNames(database).size).toBe(1);
  });
});
