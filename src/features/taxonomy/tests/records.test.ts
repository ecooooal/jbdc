import { categories, collections } from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import { expectLiveReadReruns } from '@/features/database/testing-live';
import {
  COLLECTION_YEAR_MAX,
  COLLECTION_YEAR_MIN,
  createCategory,
  createCollection,
  InvalidCollectionYearError,
  InvalidTaxonomyNameError,
  listCategories,
  listCollections,
  TAXONOMY_NAME_MAX_LENGTH,
  taxonomyRead,
} from '@/features/taxonomy';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('the Taxonomy live read', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('keeps its declared default and reads the lists once', () => {
    expect(taxonomyRead.empty).toEqual({ categories: [], collections: [] });
    expect(taxonomyRead.read(database)).toEqual({
      categories: listCategories(database),
      collections: listCollections(database),
    });
  });

  test('re-runs when either table it reads changes', async () => {
    for (const table of [categories, collections]) {
      await expectLiveReadReruns(taxonomyRead, table, database, (database) => {
        if (table === categories) {
          createCategory(database, { name: 'Knitwear' });
        } else {
          createCollection(database, { name: 'Spring 2027', year: 2027 });
        }
      });
    }
  });
});

describe('category records', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('lists the seeded garment categories', () => {
    const names = listCategories(database).map((category) => category.name);

    expect(names).toHaveLength(7);
    expect(names).toEqual(
      expect.arrayContaining([
        'Dress',
        'Blouse',
        'Skirt',
        'Pants',
        'Outerwear',
        'Two-piece set',
        'Other',
      ])
    );
  });

  test('creates a category and returns it ready to select', () => {
    const category = createCategory(database, { name: '  Knitwear  ' });

    expect(category.name).toBe('Knitwear');
    expect(category.id).toMatch(UUID_V4);
    expect(listCategories(database)).toContainEqual(category);
  });

  test('refuses a blank category name without writing', () => {
    expect(() => createCategory(database, { name: ' \n\t ' })).toThrow(InvalidTaxonomyNameError);

    expect(listCategories(database)).toHaveLength(7);
  });

  test('refuses a category name longer than the limit and accepts the boundary', () => {
    expect(() =>
      createCategory(database, { name: 'a'.repeat(TAXONOMY_NAME_MAX_LENGTH + 1) })
    ).toThrow(InvalidTaxonomyNameError);
    expect(listCategories(database)).toHaveLength(7);

    const boundary = createCategory(database, { name: 'a'.repeat(TAXONOMY_NAME_MAX_LENGTH) });

    expect(boundary.name).toHaveLength(TAXONOMY_NAME_MAX_LENGTH);
  });
});

describe('collection records', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('creates a collection with no year', () => {
    const collection = createCollection(database, { name: '  Spring  ' });

    expect(collection.name).toBe('Spring');
    expect(collection.year).toBeNull();
    expect(collection.id).toMatch(UUID_V4);
    expect(listCollections(database)).toContainEqual(collection);
  });

  test('creates a collection with an integer year', () => {
    const collection = createCollection(database, { name: 'Spring 2027', year: 2027 });

    expect(collection).toMatchObject({ name: 'Spring 2027', year: 2027 });
    expect(listCollections(database)).toContainEqual(collection);
  });

  test('accepts the first and last year it allows', () => {
    const first = createCollection(database, { name: 'First', year: COLLECTION_YEAR_MIN });
    const last = createCollection(database, { name: 'Last', year: COLLECTION_YEAR_MAX });

    expect(first.year).toBe(COLLECTION_YEAR_MIN);
    expect(last.year).toBe(COLLECTION_YEAR_MAX);
  });

  test('refuses a blank collection name without writing', () => {
    expect(() => createCollection(database, { name: ' \n\t ' })).toThrow(InvalidTaxonomyNameError);

    expect(listCollections(database)).toEqual([]);
  });

  test.each([-1, 0, COLLECTION_YEAR_MAX + 1, 2027.5, Number.NaN])(
    'refuses the year %p without writing',
    (year) => {
      expect(() => createCollection(database, { name: 'Spring', year })).toThrow(
        InvalidCollectionYearError
      );

      expect(listCollections(database)).toEqual([]);
    }
  );
});
