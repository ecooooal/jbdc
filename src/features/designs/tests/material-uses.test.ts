import { eq } from 'drizzle-orm';
import { designMaterials, designs, materials } from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import {
  addMaterialUse,
  createDesign,
  getDesign,
  InvalidMaterialUseError,
  listMaterialUses,
  updateDesign,
} from '@/features/designs';
import { createMaterial } from '@/features/materials';

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
});
