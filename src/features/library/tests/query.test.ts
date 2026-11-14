import { randomUUID } from 'node:crypto';
import { categories, collections, designs, type DesignStatus } from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import { listLibraryDesigns } from '@/features/library';

type NewDesign = {
  status?: DesignStatus;
  updatedAt?: number;
  deletedAt?: number;
  categoryId?: string;
  collectionId?: string;
};

describe('library query', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  function insertDesign(name: string, design: NewDesign = {}) {
    const id = randomUUID();
    const updatedAt = design.updatedAt ?? 0;

    database.db
      .insert(designs)
      .values({
        id,
        name,
        status: design.status ?? 'concept',
        searchText: name.toLowerCase(),
        createdAt: 0,
        updatedAt,
        deletedAt: design.deletedAt,
        categoryId: design.categoryId,
        collectionId: design.collectionId,
      })
      .run();

    return id;
  }

  test('returns no rows for an empty database', () => {
    expect(listLibraryDesigns(database)).toEqual([]);
  });

  test('excludes soft-deleted, rejected, and archived designs', () => {
    insertDesign('Soft deleted', { deletedAt: 1 });
    insertDesign('Rejected', { status: 'rejected' });
    insertDesign('Archived', { status: 'archived' });
    insertDesign('Still in development', { status: 'in_development' });

    expect(listLibraryDesigns(database).map((design) => design.name)).toEqual([
      'Still in development',
    ]);
  });

  test('includes active statuses, most recently updated first', () => {
    insertDesign('Concept', { status: 'concept', updatedAt: 10 });
    insertDesign('Produced', { status: 'produced', updatedAt: 30 });
    insertDesign('Approved', { status: 'approved', updatedAt: 20 });

    expect(listLibraryDesigns(database).map((design) => design.name)).toEqual([
      'Produced',
      'Approved',
      'Concept',
    ]);
  });

  test('returns category and collection names, or null when unset', () => {
    const categoryId = randomUUID();
    const collectionId = randomUUID();

    database.db.insert(categories).values({ id: categoryId, name: 'Dress', createdAt: 0 }).run();
    database.db
      .insert(collections)
      .values({ id: collectionId, name: 'Spring 2027', year: 2027, createdAt: 0 })
      .run();

    insertDesign('In a collection', { categoryId, collectionId, updatedAt: 40 });
    insertDesign('Bare design', { updatedAt: 50 });

    const [bare, inCollection] = listLibraryDesigns(database);

    expect(bare).toMatchObject({
      name: 'Bare design',
      category: null,
      collection: null,
    });
    expect(inCollection).toMatchObject({
      name: 'In a collection',
      category: 'Dress',
      collection: 'Spring 2027',
      status: 'concept',
    });
  });
});
