import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  categories,
  collections,
  designs,
  type DesignStatus,
} from '@/features/database';
import {
  createTempDatabase,
  openTestDatabase,
} from '@/features/database/testing';
import {
  createDesign,
  DESIGN_NAME_MAX_LENGTH,
  getDesign,
  getDesignDetail,
  InvalidDesignNameError,
  listDesigns,
} from '@/features/designs';
import { listLibraryDesigns } from '@/features/library';
import { createCategory, createCollection } from '@/features/taxonomy';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let database: ReturnType<typeof createTempDatabase>['database'];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

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
    expect(getDesign(database, design.id)).toEqual(design);
  });

  test('trims the name before saving it', () => {
    const design = createDesign(database, { name: '  Wool coat  ' });

    expect(design.name).toBe('Wool coat');
  });

  test('rejects blank and whitespace-only names without writing', () => {
    expect(() => createDesign(database, { name: '' })).toThrow(InvalidDesignNameError);
    expect(() => createDesign(database, { name: ' \n\t ' })).toThrow(InvalidDesignNameError);

    expect(listDesigns(database)).toEqual([]);
  });

  test('rejects names longer than the limit and accepts the boundary', () => {
    expect(() =>
      createDesign(database, { name: 'a'.repeat(DESIGN_NAME_MAX_LENGTH + 1) })
    ).toThrow(InvalidDesignNameError);

    expect(listDesigns(database)).toEqual([]);

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

  test('joins the chosen category and collection names everywhere a design is read', () => {
    const category = createCategory(database, { name: 'Dress' });
    const collection = createCollection(database, { name: 'Spring 2027', year: 2027 });

    const design = createDesign(
      database,
      {
        name: '  Silk Slip Dress ',
        description: ' Bias Cut ',
        categoryId: category.id,
        collectionId: collection.id,
      },
      10
    );

    expect(design).toMatchObject({
      name: 'Silk Slip Dress',
      categoryId: category.id,
      collectionId: collection.id,
    });
    expect(getDesignDetail(database, design.id)).toMatchObject({
      category: 'Dress',
      collection: 'Spring 2027',
    });
    expect(listLibraryDesigns(database)[0]).toMatchObject({
      name: 'Silk Slip Dress',
      category: 'Dress',
      collection: 'Spring 2027',
    });

    const row = database.db
      .select({ searchText: designs.searchText })
      .from(designs)
      .get();

    expect(row?.searchText).toBe('silk slip dress bias cut dress spring 2027');
  });

  test('lists designs most recently updated first', () => {
    createDesign(database, { name: 'First' }, 10);
    createDesign(database, { name: 'Third' }, 30);
    createDesign(database, { name: 'Second' }, 20);

    expect(listDesigns(database).map((design) => design.name)).toEqual([
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

    expect(getDesign(database, removed.id)).toBeNull();
    expect(getDesign(database, kept.id)).toMatchObject({ name: 'Kept' });
    expect(listDesigns(database).map((design) => design.name)).toEqual(['Kept']);
  });

  test('a created design is in the Library query', () => {
    const design = createDesign(database, { name: 'Linen shirt' }, 10);

    expect(listLibraryDesigns(database)).toEqual([
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
      expect(getDesign(reopened, design.id)).toMatchObject({ name: 'Archive coat' });
      expect(listLibraryDesigns(reopened).map((row) => row.name)).toEqual(['Archive coat']);
    } finally {
      reopened.close();
      disposeFirst();
    }
  });
});

describe('design detail', () => {
  type DetailDesign = {
    name: string;
    description?: string | null;
    categoryId?: string | null;
    collectionId?: string | null;
    status?: DesignStatus;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
  };

  function insertDetailDesign(input: DetailDesign): string {
    const id = randomUUID();

    database.db
      .insert(designs)
      .values({
        id,
        name: input.name,
        description: input.description ?? null,
        categoryId: input.categoryId ?? null,
        collectionId: input.collectionId ?? null,
        status: input.status ?? 'concept',
        searchText: input.name.toLowerCase(),
        createdAt: input.createdAt ?? 0,
        updatedAt: input.updatedAt ?? 0,
        deletedAt: input.deletedAt ?? null,
      })
      .run();

    return id;
  }

  test('reads every displayed field with its category and collection names', () => {
    const categoryId = randomUUID();
    const collectionId = randomUUID();

    database.db.insert(categories).values({ id: categoryId, name: 'Dress', createdAt: 0 }).run();
    database.db
      .insert(collections)
      .values({ id: collectionId, name: 'Spring 2027', year: 2027, createdAt: 0 })
      .run();

    const id = insertDetailDesign({
      name: 'Silk slip dress',
      description: 'Bias cut, cowl neck.',
      categoryId,
      collectionId,
      status: 'approved',
      createdAt: 10,
      updatedAt: 20,
    });

    expect(getDesignDetail(database, id)).toEqual({
      id,
      name: 'Silk slip dress',
      description: 'Bias cut, cowl neck.',
      categoryId,
      collectionId,
      category: 'Dress',
      collection: 'Spring 2027',
      status: 'approved',
      createdAt: 10,
      updatedAt: 20,
      deletedAt: null,
    });
  });

  test('a design with no description, category, or collection is still readable', () => {
    const id = insertDetailDesign({ name: 'Unfinished idea' });

    expect(getDesignDetail(database, id)).toMatchObject({
      name: 'Unfinished idea',
      description: null,
      category: null,
      collection: null,
    });
  });

  test.each(['rejected', 'archived'] as const)(
    'reads a %s design the Library hides',
    (status) => {
      const id = insertDetailDesign({ name: 'Kept for the record', status });

      expect(getDesignDetail(database, id)).toMatchObject({ name: 'Kept for the record', status });
    }
  );

  test('returns null for a soft-deleted or unknown design', () => {
    const removed = insertDetailDesign({ name: 'Removed', deletedAt: 30 });

    expect(getDesignDetail(database, removed)).toBeNull();
    expect(getDesignDetail(database, randomUUID())).toBeNull();
  });
});
