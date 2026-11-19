import { eq, getTableColumns } from 'drizzle-orm';
import { designs } from '@/features/database';
import { createTempDatabase, openTestDatabase } from '@/features/database/testing';
import {
  createDesign,
  DESIGN_NAME_MAX_LENGTH,
  designNameProblem,
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
  test('creates a design from a name alone', () => {
    const now = 1_760_000_000_000;
    const design = createDesign(database, { name: 'Silk slip dress' }, now);

    expect(design).toMatchObject({
      name: 'Silk slip dress',
      description: null,
      categoryId: null,
      collectionId: null,
      silhouette: null,
      neckline: null,
      sleeveType: null,
      garmentDetails: null,
      sizeRange: null,
      measurements: null,
      constructionNotes: null,
      concept: null,
      mood: null,
      inspiration: null,
      intendedFeeling: null,
      audience: null,
      styling: null,
      palette: null,
      status: 'concept',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    expect(design.id).toMatch(UUID_V4);
    expect(getDesign(database, design.id)).toEqual(design);
  });

  test('a Design read carries every stored column except the derived search text', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);
    const stored = getDesign(database, design.id)!;
    const columns = Object.keys(getTableColumns(designs))
      .filter((name) => name !== 'searchText')
      .sort();

    expect(Object.keys(stored).sort()).toEqual(columns);
  });

  test('round-trips every Specification field through create', () => {
    const design = createDesign(database, {
      name: 'Silk slip dress',
      silhouette: '  Relaxed A-line  ',
      neckline: 'Wide boat neck',
      sleeveType: 'Dropped shoulder',
      garmentDetails: 'Concealed side zip, two pockets',
      sizeRange: 'UK 8–16',
      measurements: 'Bust 96 / waist 104 / hip 112',
      constructionNotes: 'French seams throughout',
    });

    expect(design).toMatchObject({
      silhouette: 'Relaxed A-line',
      neckline: 'Wide boat neck',
      sleeveType: 'Dropped shoulder',
      garmentDetails: 'Concealed side zip, two pockets',
      sizeRange: 'UK 8–16',
      measurements: 'Bust 96 / waist 104 / hip 112',
      constructionNotes: 'French seams throughout',
    });
    expect(getDesign(database, design.id)).toEqual(design);
  });

  test('creates a Specification field left blank as null', () => {
    const design = createDesign(database, {
      name: 'Silk slip dress',
      silhouette: '   ',
      neckline: '',
      measurements: ' \n\t ',
    });

    expect(design).toMatchObject({
      silhouette: null,
      neckline: null,
      measurements: null,
    });
  });

  test('round-trips every Creative direction field through create', () => {
    const design = createDesign(database, {
      name: 'Sunday Afternoon',
      concept: '  A dress that feels like a slow summer day  ',
      mood: 'Romantic, relaxed, feminine',
      inspiration: 'Slow summer afternoons',
      intendedFeeling: 'Comfortable but elegant',
      audience: 'Women who appreciate understated clothing',
      styling: 'Minimal jewellery, sandals',
      palette: 'Ivory, cream, muted beige',
    });

    expect(design).toMatchObject({
      concept: 'A dress that feels like a slow summer day',
      mood: 'Romantic, relaxed, feminine',
      inspiration: 'Slow summer afternoons',
      intendedFeeling: 'Comfortable but elegant',
      audience: 'Women who appreciate understated clothing',
      styling: 'Minimal jewellery, sandals',
      palette: 'Ivory, cream, muted beige',
    });
    expect(getDesign(database, design.id)).toEqual(design);
  });

  test('creates a Creative direction field left blank as null', () => {
    const design = createDesign(database, {
      name: 'Sunday Afternoon',
      concept: '   ',
      mood: '',
      palette: ' \n\t ',
    });

    expect(design).toMatchObject({
      concept: null,
      mood: null,
      palette: null,
    });
  });

  test('keeps description and concept as separate ideas', () => {
    const design = createDesign(database, {
      name: 'Sunday Afternoon',
      description: 'A bias-cut slip dress with a cowl neck.',
      concept: 'To make an ordinary afternoon feel considered.',
    });

    expect(design).toMatchObject({
      description: 'A bias-cut slip dress with a cowl neck.',
      concept: 'To make an ordinary afternoon feel considered.',
    });
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

  test('includes the Specification values in search text', () => {
    createDesign(database, {
      name: 'Silk Slip Dress',
      silhouette: ' Relaxed A-line ',
      garmentDetails: 'Concealed zip',
      measurements: 'Bust 96',
    });

    const row = database.db
      .select({ searchText: designs.searchText })
      .from(designs)
      .get();

    expect(row?.searchText).toBe('silk slip dress relaxed a-line concealed zip bust 96');
  });

  test('includes the Creative direction values in search text', () => {
    createDesign(database, {
      name: 'Sunday Afternoon',
      concept: ' Slow summer day ',
      mood: 'Romantic',
      palette: ' Ivory and cream ',
    });

    const row = database.db
      .select({ searchText: designs.searchText })
      .from(designs)
      .get();

    expect(row?.searchText).toBe('sunday afternoon slow summer day romantic ivory and cream');
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
      collection: 'Spring 2027 (2027)',
    });
    expect(listLibraryDesigns(database)[0]).toMatchObject({
      name: 'Silk Slip Dress',
      category: 'Dress',
      collection: 'Spring 2027 (2027)',
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

describe('design name rule', () => {
  test('separates an empty name from an over-long one', () => {
    expect(designNameProblem('')).toBe('empty');
    expect(designNameProblem('  \n\t ')).toBe('empty');
    expect(designNameProblem('a'.repeat(DESIGN_NAME_MAX_LENGTH))).toBeNull();
    expect(designNameProblem('a'.repeat(DESIGN_NAME_MAX_LENGTH + 1))).toBe('too_long');
  });
});
