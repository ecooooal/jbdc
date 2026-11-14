import { eq } from 'drizzle-orm';
import { designs } from '@/features/database';
import {
  createTempDatabase,
  openTestDatabase,
} from '@/features/database/testing';
import {
  createDesign,
  DESIGN_NAME_MAX_LENGTH,
  getDesign,
  InvalidDesignNameError,
  listDesigns,
} from '@/features/designs';
import { listLibraryDesigns } from '@/features/library';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('design records', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('creates a design from a name alone', () => {
    const now = 1_760_000_000_000;
    const design = createDesign(database, { name: 'Silk slip dress' }, now);

    expect(design).toMatchObject({
      name: 'Silk slip dress',
      description: null,
      categoryId: null,
      collectionId: null,
      status: 'concept',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    expect(design.id).toMatch(UUID_V4);
    expect(getDesign(database.db, design.id)).toEqual(design);
  });

  test('trims the name before saving it', () => {
    const design = createDesign(database, { name: '  Wool coat  ' });

    expect(design.name).toBe('Wool coat');
  });

  test('rejects blank and whitespace-only names without writing', () => {
    expect(() => createDesign(database, { name: '' })).toThrow(InvalidDesignNameError);
    expect(() => createDesign(database, { name: ' \n\t ' })).toThrow(InvalidDesignNameError);

    expect(listDesigns(database.db)).toEqual([]);
  });

  test('rejects names longer than the limit and accepts the boundary', () => {
    expect(() =>
      createDesign(database, { name: 'a'.repeat(DESIGN_NAME_MAX_LENGTH + 1) })
    ).toThrow(InvalidDesignNameError);

    expect(listDesigns(database.db)).toEqual([]);

    const boundary = createDesign(database, { name: 'a'.repeat(DESIGN_NAME_MAX_LENGTH) });
    expect(boundary.name).toHaveLength(DESIGN_NAME_MAX_LENGTH);
  });

  test('rebuilds search text from name and description on every write', () => {
    createDesign(database, { name: '  Silk Slip Dress ', description: ' Bias Cut ' });

    const row = database.db
      .select({ searchText: designs.searchText })
      .from(designs)
      .get();

    expect(row?.searchText).toBe('silk slip dress bias cut');
  });

  test('lists designs most recently updated first', () => {
    createDesign(database, { name: 'First' }, 10);
    createDesign(database, { name: 'Third' }, 30);
    createDesign(database, { name: 'Second' }, 20);

    expect(listDesigns(database.db).map((design) => design.name)).toEqual([
      'Third',
      'Second',
      'First',
    ]);
  });

  test('omits soft-deleted designs from reads and lists', () => {
    const kept = createDesign(database, { name: 'Kept' }, 10);
    const removed = createDesign(database, { name: 'Removed' }, 20);

    database.db
      .update(designs)
      .set({ deletedAt: 30 })
      .where(eq(designs.id, removed.id))
      .run();

    expect(getDesign(database.db, removed.id)).toBeNull();
    expect(getDesign(database.db, kept.id)).toMatchObject({ name: 'Kept' });
    expect(listDesigns(database.db).map((design) => design.name)).toEqual(['Kept']);
  });

  test('a created design is in the Library query', () => {
    const design = createDesign(database, { name: 'Linen shirt' }, 10);

    expect(listLibraryDesigns(database.db)).toEqual([
      {
        id: design.id,
        name: 'Linen shirt',
        category: null,
        collection: null,
        status: 'concept',
        updatedAt: 10,
      },
    ]);
  });

  test('a design created before a relaunch is still in the Library after it', () => {
    const { database: first, path, dispose: disposeFirst } = createTempDatabase();
    const design = createDesign(first, { name: 'Archive coat' }, 10);

    first.close();

    const reopened = openTestDatabase(path);

    try {
      expect(getDesign(reopened.db, design.id)).toMatchObject({ name: 'Archive coat' });
      expect(listLibraryDesigns(reopened.db).map((row) => row.name)).toEqual(['Archive coat']);
    } finally {
      reopened.close();
      disposeFirst();
    }
  });
});
