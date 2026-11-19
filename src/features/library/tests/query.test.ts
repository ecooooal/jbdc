import { randomUUID } from 'node:crypto';
import {
  categories,
  collections,
  DESIGN_STATUSES,
  designs,
  type Database,
  type DesignStatus,
  type LiveReadTable,
} from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import { expectLiveReadReruns } from '@/features/database/testing-live';
import { createDesign } from '@/features/designs';
import { libraryDesignsRead, listLibraryDesigns } from '@/features/library';
import { createCategory, createCollection } from '@/features/taxonomy';

type NewDesign = {
  status?: DesignStatus;
  updatedAt?: number;
  deletedAt?: number;
  categoryId?: string;
  collectionId?: string;
};

describe('the Library live read', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('keeps its declared default and matches the direct read', () => {
    expect(libraryDesignsRead.empty).toEqual({ designs: [] });
    expect(libraryDesignsRead.read(database)).toEqual({ designs: listLibraryDesigns(database) });
  });

  test('re-runs when any table it reads changes', async () => {
    const writes = new Map<LiveReadTable, (db: Database) => void>([
      [designs, (db) => createDesign(db, { name: 'Wool coat' })],
      [categories, (db) => createCategory(db, { name: 'Knitwear' })],
      [collections, (db) => createCollection(db, { name: 'Spring 2027', year: 2027 })],
    ]);

    for (const [table, write] of writes) {
      await expectLiveReadReruns(libraryDesignsRead, table, database, write);
    }
  });
});

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

  test('includes exactly the Statuses that are neither Rejected nor Archived', () => {
    for (const status of DESIGN_STATUSES) insertDesign(status, { status });

    const statuses = listLibraryDesigns(database).map((design) => design.status);
    const shown = DESIGN_STATUSES.filter(
      (status) => status !== 'rejected' && status !== 'archived'
    );

    expect([...statuses].sort()).toEqual([...shown].sort());
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
      collection: 'Spring 2027 (2027)',
      status: 'concept',
    });
  });

  test('shows a Collection carrying a year with the year in its label', () => {
    const collectionId = randomUUID();

    database.db
      .insert(collections)
      .values({ id: collectionId, name: 'Spring', year: 2027, createdAt: 0 })
      .run();
    insertDesign('In a collection', { collectionId, updatedAt: 40 });

    expect(listLibraryDesigns(database)[0].collection).toBe('Spring (2027)');
  });

  test('shows a Collection stored without a year by its bare name', () => {
    const collectionId = randomUUID();

    database.db
      .insert(collections)
      .values({ id: collectionId, name: 'Spring', year: null, createdAt: 0 })
      .run();
    insertDesign('In a collection', { collectionId, updatedAt: 40 });

    expect(listLibraryDesigns(database)[0].collection).toBe('Spring');
  });
});
