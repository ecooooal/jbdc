import { eq } from 'drizzle-orm';
import { designs } from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import {
  createDesign,
  getDesign,
  InvalidMaterialUseError,
  listMaterialUses,
  writeDesign,
} from '@/features/designs';
import { createMaterial } from '@/features/materials';

function storedSearchText(database: ReturnType<typeof createTempDatabase>['database']): string {
  return database.db.select({ searchText: designs.searchText }).from(designs).get()!.searchText;
}

describe('one Design write', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('stores a field change and its search text together, or neither on a refusal', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });

    expect(() =>
      writeDesign(
        database,
        design.id,
        {
          fields: { name: 'Linen shirt' },
          uses: [{ kind: 'add', input: { materialId: wool.id, colour: '   ', role: 'main' } }],
        },
        20
      )
    ).toThrow(InvalidMaterialUseError);

    // A refused write stored neither the row nor its rebuilt search text.
    expect(getDesign(database, design.id)).toMatchObject({ name: 'Wool coat', updatedAt: 10 });
    expect(storedSearchText(database)).toBe('wool coat');
  });

  test('applies field and Material use changes in one write and rebuilds search text once', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const silk = createMaterial(database, { name: 'Silk crêpe' });
    const first = writeDesign(
      database,
      design.id,
      { uses: [{ kind: 'add', input: { materialId: wool.id, colour: 'Charcoal', role: 'main' } }] },
      20
    )!;

    const result = writeDesign(
      database,
      design.id,
      {
        fields: { description: 'Heavy twill' },
        uses: [
          { kind: 'correct', useId: first.added[0].id, patch: { materialId: silk.id } },
          { kind: 'add', input: { materialId: wool.id, colour: 'Black', role: 'other' } },
        ],
      },
      30
    )!;

    expect(result.design).toMatchObject({ name: 'Wool coat', description: 'Heavy twill', updatedAt: 30 });
    expect(result.corrected).toHaveLength(1);
    expect(result.corrected[0]).toMatchObject({ materialName: 'Silk crêpe' });
    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toMatchObject({ materialName: 'Wool', colour: 'Black' });
    expect(storedSearchText(database)).toBe(
      'wool coat heavy twill silk crêpe charcoal wool black'
    );
    expect(listMaterialUses(database, design.id)).toHaveLength(2);
  });

  test('a write that changes nothing leaves the row and its search text alone', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const first = writeDesign(
      database,
      design.id,
      { uses: [{ kind: 'add', input: { materialId: wool.id, colour: 'Charcoal', role: 'main' } }] },
      20
    )!;

    const result = writeDesign(
      database,
      design.id,
      {
        fields: { name: ' Wool coat ' },
        uses: [{ kind: 'correct', useId: first.added[0].id, patch: { colour: 'Charcoal' } }],
      },
      30
    )!;

    expect(result.design).toMatchObject({ name: 'Wool coat', updatedAt: 20 });
    expect(storedSearchText(database)).toBe('wool coat wool charcoal');
  });

  test('removing a use reports the removed use and rebuilds search text', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const first = writeDesign(
      database,
      design.id,
      { uses: [{ kind: 'add', input: { materialId: wool.id, colour: 'Charcoal', role: 'main' } }] },
      20
    )!;

    const result = writeDesign(
      database,
      design.id,
      { uses: [{ kind: 'remove', useId: first.added[0].id }] },
      30
    )!;

    expect(result.removed).toMatchObject([{ id: first.added[0].id, materialName: 'Wool' }]);
    expect(storedSearchText(database)).toBe('wool coat');
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 30 });
  });

  test('returns null naming the Design row when it is no longer in the catalog', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    database.db.update(designs).set({ deletedAt: 15 }).where(eq(designs.id, design.id)).run();

    expect(writeDesign(database, design.id, { fields: { name: 'Linen shirt' } }, 20)).toBeNull();
  });
});
