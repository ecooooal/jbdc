import { eq } from 'drizzle-orm';
import { materials } from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import {
  createMaterial,
  InvalidMaterialNameError,
  listMaterials,
  MATERIAL_NAME_MAX_LENGTH,
  readMaterialNames,
} from '@/features/materials';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('material records', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('starts empty: Materials have no seed', () => {
    expect(listMaterials(database)).toEqual([]);
  });

  test('creates a Material with its name trimmed and returns it ready to select', () => {
    const material = createMaterial(database, { name: '  Silk crêpe  ' });

    expect(material.name).toBe('Silk crêpe');
    expect(material.id).toMatch(UUID_V4);
    expect(listMaterials(database)).toEqual([material]);
  });

  test('lists Materials alphabetically', () => {
    createMaterial(database, { name: 'Linen' });
    createMaterial(database, { name: 'Cotton poplin' });

    expect(listMaterials(database).map((material) => material.name)).toEqual([
      'Cotton poplin',
      'Linen',
    ]);
  });

  test('refuses a blank name without writing', () => {
    expect(() => createMaterial(database, { name: ' \n\t ' })).toThrow(InvalidMaterialNameError);

    expect(listMaterials(database)).toEqual([]);
  });

  test('refuses an exact duplicate name without writing', () => {
    createMaterial(database, { name: 'Silk crêpe' });

    expect(() => createMaterial(database, { name: '  Silk crêpe  ' })).toThrow(
      InvalidMaterialNameError
    );
    expect(listMaterials(database)).toHaveLength(1);
  });

  test('refuses a name longer than the limit and accepts the boundary', () => {
    expect(() =>
      createMaterial(database, { name: 'a'.repeat(MATERIAL_NAME_MAX_LENGTH + 1) })
    ).toThrow(InvalidMaterialNameError);
    expect(listMaterials(database)).toEqual([]);

    const boundary = createMaterial(database, { name: 'a'.repeat(MATERIAL_NAME_MAX_LENGTH) });

    expect(boundary.name).toHaveLength(MATERIAL_NAME_MAX_LENGTH);
  });

  test('a soft-deleted Material leaves the picker but keeps its name for an old use', () => {
    const material = createMaterial(database, { name: 'Silk crêpe' });

    database.db.update(materials).set({ deletedAt: 10 }).where(eq(materials.id, material.id)).run();

    expect(listMaterials(database)).toEqual([]);
    expect(readMaterialNames(database).get(material.id)).toBe('Silk crêpe');
  });

  test('a name removed from the list can be added again', () => {
    const removed = createMaterial(database, { name: 'Silk crêpe' });
    database.db.update(materials).set({ deletedAt: 10 }).where(eq(materials.id, removed.id)).run();

    const restored = createMaterial(database, { name: 'Silk crêpe' });

    expect(restored.id).not.toBe(removed.id);
    expect(listMaterials(database)).toEqual([restored]);
  });
});
