import { eq } from 'drizzle-orm';
import type { Database } from '@/features/database';
import { designMaterials, designs, materials } from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import {
  createDesign,
  getDesign,
  InvalidMaterialUseError,
  listMaterialUses,
  writeDesign,
  type AddMaterialUseInput,
  type MaterialUse,
  type UpdateDesignInput,
  type UpdateMaterialUseInput,
} from '@/features/designs';
import { createMaterial } from '@/features/materials';

/** The visit's one write path, driven by a fixture for the tests that only need a use. */
function addMaterialUse(
  database: Database,
  designId: string,
  input: AddMaterialUseInput,
  now?: number
): MaterialUse | null {
  return writeDesign(database, designId, { uses: [{ kind: 'add', input }] }, now)?.added[0] ?? null;
}

function updateMaterialUse(
  database: Database,
  designId: string,
  useId: string,
  input: UpdateMaterialUseInput,
  now?: number
): MaterialUse | null {
  return (
    writeDesign(database, designId, { uses: [{ kind: 'correct', useId, patch: input }] }, now)
      ?.corrected[0] ?? null
  );
}

function removeMaterialUse(
  database: Database,
  designId: string,
  useId: string,
  now?: number
): MaterialUse | null {
  return (
    writeDesign(database, designId, { uses: [{ kind: 'remove', useId }] }, now)?.removed[0] ?? null
  );
}

function updateDesign(
  database: Database,
  designId: string,
  input: UpdateDesignInput,
  now?: number
) {
  return writeDesign(database, designId, { fields: input }, now)?.design ?? null;
}

function storedSearchText(database: ReturnType<typeof createTempDatabase>['database']): string {
  return database.db.select({ searchText: designs.searchText }).from(designs).get()!.searchText;
}

describe('material uses', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('adds a use with a Material, colour, and role', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);
    const silk = createMaterial(database, { name: 'Silk crêpe' });

    const use = addMaterialUse(
      database,
      design.id,
      { materialId: silk.id, colour: 'Ivory', role: 'main' },
      20
    );

    expect(use).toMatchObject({
      designId: design.id,
      materialId: silk.id,
      materialName: 'Silk crêpe',
      colour: 'Ivory',
      role: 'main',
      createdAt: 20,
    });
    expect(listMaterialUses(database, design.id)).toEqual([use]);
  });

  test('allows the same Material twice in different colours', () => {
    const design = createDesign(database, { name: 'Silk slip dress' });
    const silk = createMaterial(database, { name: 'Silk crêpe' });

    addMaterialUse(database, design.id, {
      materialId: silk.id,
      colour: 'Ivory',
      role: 'main',
    });
    addMaterialUse(database, design.id, {
      materialId: silk.id,
      colour: 'Black',
      role: 'secondary',
    });

    expect(listMaterialUses(database, design.id)).toHaveLength(2);
  });

  test('orders uses by role (main, secondary, other), then Material name', () => {
    const design = createDesign(database, { name: 'Wool coat' });
    const wool = createMaterial(database, { name: 'Wool' });
    const lining = createMaterial(database, { name: 'Cupro lining' });
    const silk = createMaterial(database, { name: 'Silk crêpe' });
    const trim = createMaterial(database, { name: 'Brass buttons' });

    addMaterialUse(database, design.id, {
      materialId: trim.id,
      colour: 'Antique brass',
      role: 'other',
    });
    addMaterialUse(database, design.id, {
      materialId: silk.id,
      colour: 'Ivory',
      role: 'secondary',
    });
    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: 'Charcoal',
      role: 'main',
    });
    addMaterialUse(database, design.id, {
      materialId: lining.id,
      colour: 'Taupe',
      role: 'secondary',
    });

    expect(listMaterialUses(database, design.id).map((use) => [use.role, use.materialName])).toEqual(
      [
        ['main', 'Wool'],
        ['secondary', 'Cupro lining'],
        ['secondary', 'Silk crêpe'],
        ['other', 'Brass buttons'],
      ]
    );
  });

  test('rebuilds search text with every Material name and colour, and moves Updated', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const lining = createMaterial(database, { name: 'Cupro lining' });

    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: 'Charcoal',
      role: 'main',
    });
    addMaterialUse(
      database,
      design.id,
      { materialId: lining.id, colour: 'Taupe', role: 'secondary' },
      20
    );

    expect(storedSearchText(database)).toBe('wool coat wool charcoal cupro lining taupe');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 20 });
  });

  test('keeps Material names and colours in search text when a design field is written', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });

    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: 'Charcoal',
      role: 'main',
    });
    updateDesign(database, design.id, { description: 'Heavy twill' }, 20);

    expect(storedSearchText(database)).toBe('wool coat heavy twill wool charcoal');
  });

  test('a soft-deleted Material still resolves the name of an old use', () => {
    const design = createDesign(database, { name: 'Wool coat' });
    const wool = createMaterial(database, { name: 'Wool' });

    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: 'Charcoal',
      role: 'main',
    });
    database.db.update(materials).set({ deletedAt: 20 }).where(eq(materials.id, wool.id)).run();

    expect(listMaterialUses(database, design.id)[0]).toMatchObject({ materialName: 'Wool' });
  });

  test('trims the colour and refuses a blank one without writing', () => {
    const design = createDesign(database, { name: 'Wool coat' });
    const wool = createMaterial(database, { name: 'Wool' });

    expect(() =>
      addMaterialUse(database, design.id, {
        materialId: wool.id,
        colour: '   ',
        role: 'main',
      })
    ).toThrow(InvalidMaterialUseError);
    expect(database.db.select().from(designMaterials).all()).toEqual([]);

    const use = addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: '  Charcoal  ',
      role: 'main',
    });

    expect(use?.colour).toBe('Charcoal');
  });

  test('returns null for an unknown design and writes nothing', () => {
    const wool = createMaterial(database, { name: 'Wool' });

    expect(
      addMaterialUse(database, 'missing-design', {
        materialId: wool.id,
        colour: 'Charcoal',
        role: 'main',
      })
    ).toBeNull();
    expect(database.db.select().from(designMaterials).all()).toEqual([]);
  });

  test('corrects a colour, rebuilding search text and moving Updated', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    const updated = updateMaterialUse(database, design.id, use.id, { colour: '  Black  ' }, 30);

    expect(updated).toMatchObject({
      id: use.id,
      materialName: 'Wool',
      colour: 'Black',
      role: 'main',
    });
    expect(listMaterialUses(database, design.id)).toEqual([updated]);
    expect(storedSearchText(database)).toBe('wool coat wool black');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 30 });
  });

  test('corrects the Material, swapping its name in the search text', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const silk = createMaterial(database, { name: 'Silk crêpe' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    const updated = updateMaterialUse(database, design.id, use.id, { materialId: silk.id }, 30);

    expect(updated).toMatchObject({ materialId: silk.id, materialName: 'Silk crêpe' });
    expect(storedSearchText(database)).toBe('wool coat silk crêpe charcoal');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 30 });
  });

  test('corrects a role without changing search text but still moves Updated', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    const updated = updateMaterialUse(database, design.id, use.id, { role: 'secondary' }, 30);

    expect(updated).toMatchObject({ role: 'secondary' });
    expect(storedSearchText(database)).toBe('wool coat wool charcoal');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 30 });
  });

  test('re-sorts by role then name after a role change', () => {
    const design = createDesign(database, { name: 'Wool coat' });
    const wool = createMaterial(database, { name: 'Wool' });
    const lining = createMaterial(database, { name: 'Cupro lining' });
    const woolUse = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    addMaterialUse(
      database,
      design.id,
      { materialId: lining.id, colour: 'Taupe', role: 'secondary' },
      30
    );
    updateMaterialUse(database, design.id, woolUse.id, { role: 'secondary' }, 40);

    expect(listMaterialUses(database, design.id).map((use) => [use.role, use.materialName])).toEqual(
      [
        ['secondary', 'Cupro lining'],
        ['secondary', 'Wool'],
      ]
    );
  });

  test('removes a use, rebuilding search text without its name and colour', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const lining = createMaterial(database, { name: 'Cupro lining' });
    const woolUse = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    addMaterialUse(
      database,
      design.id,
      { materialId: lining.id, colour: 'Taupe', role: 'secondary' },
      30
    );

    const removed = removeMaterialUse(database, design.id, woolUse.id, 40);

    expect(removed).toMatchObject({ id: woolUse.id, materialName: 'Wool', colour: 'Charcoal' });
    expect(listMaterialUses(database, design.id).map((use) => use.materialName)).toEqual([
      'Cupro lining',
    ]);
    expect(storedSearchText(database)).toBe('wool coat cupro lining taupe');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 40 });
  });

  test('removing the last use leaves the Design searchable by its own fields', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    removeMaterialUse(database, design.id, use.id, 30);

    expect(storedSearchText(database)).toBe('wool coat');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 30 });
  });

  test('refuses a blank colour on a correction and writes nothing', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    expect(() =>
      updateMaterialUse(database, design.id, use.id, { colour: '   ' }, 30)
    ).toThrow(InvalidMaterialUseError);

    expect(listMaterialUses(database, design.id)).toEqual([use]);
    expect(storedSearchText(database)).toBe('wool coat wool charcoal');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 20 });
  });

  test('a correction that changes nothing writes nothing', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    expect(
      updateMaterialUse(database, design.id, use.id, { colour: 'Charcoal' }, 30)
    ).toMatchObject({ id: use.id });
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 20 });
  });

  test('returns null for an unknown design or use and writes nothing', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    expect(
      updateMaterialUse(database, design.id, 'missing-use', { colour: 'Black' }, 30)
    ).toBeNull();
    expect(
      updateMaterialUse(database, 'missing-design', use.id, { colour: 'Black' }, 30)
    ).toBeNull();
    expect(removeMaterialUse(database, design.id, 'missing-use', 30)).toBeNull();
    expect(removeMaterialUse(database, 'missing-design', use.id, 30)).toBeNull();

    expect(listMaterialUses(database, design.id)).toEqual([use]);
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 20 });
  });

  test('the same Material twice in different colours survives correcting one use', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const main = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    )!;

    addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Black', role: 'secondary' },
      30
    );
    updateMaterialUse(database, design.id, main.id, { colour: 'Ivory' }, 40);

    expect(listMaterialUses(database, design.id).map((use) => [use.colour, use.role])).toEqual([
      ['Ivory', 'main'],
      ['Black', 'secondary'],
    ]);
    expect(storedSearchText(database)).toBe('wool coat wool ivory wool black');
  });
});
