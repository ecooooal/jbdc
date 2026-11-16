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
  designNameProblem,
  getDesign,
  getDesignDetail,
  InvalidDesignNameError,
  listDesigns,
  updateDesign,
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

describe('design name rule', () => {
  test('separates an empty name from an over-long one', () => {
    expect(designNameProblem('')).toBe('empty');
    expect(designNameProblem('  \n\t ')).toBe('empty');
    expect(designNameProblem('a'.repeat(DESIGN_NAME_MAX_LENGTH))).toBeNull();
    expect(designNameProblem('a'.repeat(DESIGN_NAME_MAX_LENGTH + 1))).toBe('too_long');
  });
});

describe('design updates', () => {
  function storedSearchText(): string | undefined {
    return database.db.select({ searchText: designs.searchText }).from(designs).get()?.searchText;
  }

  test('persists each editable field and rebuilds search text on every write', () => {
    const oldCategory = createCategory(database, { name: 'Dress' });
    const category = createCategory(database, { name: 'Knitwear' });
    const collection = createCollection(database, { name: 'Spring 2027', year: 2027 });
    const design = createDesign(
      database,
      {
        name: 'Silk slip',
        description: 'Bias cut',
        categoryId: oldCategory.id,
      },
      10
    );

    const updated = updateDesign(
      database,
      design.id,
      {
        name: '  Wool coat ',
        description: ' Heavy twill ',
        categoryId: category.id,
        collectionId: collection.id,
      },
      20
    );

    expect(updated).toMatchObject({
      id: design.id,
      name: 'Wool coat',
      description: 'Heavy twill',
      categoryId: category.id,
      collectionId: collection.id,
      status: 'concept',
      createdAt: 10,
      updatedAt: 20,
    });
    expect(getDesignDetail(database, design.id)).toMatchObject({
      name: 'Wool coat',
      description: 'Heavy twill',
      category: 'Knitwear',
      collection: 'Spring 2027',
    });
    expect(listLibraryDesigns(database)[0]).toMatchObject({
      name: 'Wool coat',
      category: 'Knitwear',
      collection: 'Spring 2027',
    });
    expect(storedSearchText()).toBe('wool coat heavy twill knitwear spring 2027');
  });

  test('persists every Specification field and rebuilds search text', () => {
    const design = createDesign(database, { name: 'Silk slip' }, 10);

    const updated = updateDesign(
      database,
      design.id,
      {
        silhouette: ' Relaxed A-line ',
        neckline: 'Wide boat neck',
        sleeveType: 'Dropped shoulder',
        garmentDetails: 'Concealed side zip',
        sizeRange: 'UK 8–16',
        measurements: 'Bust 96',
        constructionNotes: 'French seams',
      },
      20
    );

    expect(updated).toMatchObject({
      name: 'Silk slip',
      silhouette: 'Relaxed A-line',
      neckline: 'Wide boat neck',
      sleeveType: 'Dropped shoulder',
      garmentDetails: 'Concealed side zip',
      sizeRange: 'UK 8–16',
      measurements: 'Bust 96',
      constructionNotes: 'French seams',
      updatedAt: 20,
    });
    expect(getDesign(database, design.id)).toEqual(updated);
    expect(storedSearchText()).toBe(
      'silk slip relaxed a-line wide boat neck dropped shoulder concealed side zip uk 8–16 bust 96 french seams'
    );
  });

  test('persists every Creative direction field and rebuilds search text', () => {
    const design = createDesign(database, { name: 'Sunday Afternoon' }, 10);

    const updated = updateDesign(
      database,
      design.id,
      {
        concept: ' A slow summer day ',
        mood: 'Romantic',
        inspiration: 'Summer afternoons',
        intendedFeeling: 'Comfortable but elegant',
        audience: 'Understated dressers',
        styling: 'Sandals',
        palette: 'Ivory and cream',
      },
      20
    );

    expect(updated).toMatchObject({
      name: 'Sunday Afternoon',
      concept: 'A slow summer day',
      mood: 'Romantic',
      inspiration: 'Summer afternoons',
      intendedFeeling: 'Comfortable but elegant',
      audience: 'Understated dressers',
      styling: 'Sandals',
      palette: 'Ivory and cream',
      updatedAt: 20,
    });
    expect(getDesign(database, design.id)).toEqual(updated);
    expect(storedSearchText()).toBe(
      'sunday afternoon a slow summer day romantic summer afternoons comfortable but elegant understated dressers sandals ivory and cream'
    );
  });

  test('clears a Creative direction field with null or whitespace alone', () => {
    const design = createDesign(
      database,
      { name: 'Sunday Afternoon', mood: 'Romantic', palette: 'Ivory' },
      10
    );

    expect(updateDesign(database, design.id, { mood: null, palette: '   ' }, 20)).toMatchObject({
      mood: null,
      palette: null,
      updatedAt: 20,
    });
  });

  test('an update leaves Creative direction fields it does not name alone', () => {
    const design = createDesign(
      database,
      { name: 'Sunday Afternoon', concept: 'Slow summer day', palette: 'Ivory' },
      10
    );

    expect(updateDesign(database, design.id, { mood: 'Romantic' }, 20)).toMatchObject({
      concept: 'Slow summer day',
      palette: 'Ivory',
      mood: 'Romantic',
      updatedAt: 20,
    });
  });

  test('clears a Specification field with null or whitespace alone', () => {
    const design = createDesign(
      database,
      { name: 'Silk slip', neckline: 'Wide boat neck', sizeRange: 'UK 8–16' },
      10
    );

    expect(
      updateDesign(database, design.id, { neckline: null, sizeRange: '   ' }, 20)
    ).toMatchObject({
      neckline: null,
      sizeRange: null,
      updatedAt: 20,
    });
  });

  test('an update leaves Specification fields it does not name alone', () => {
    const design = createDesign(
      database,
      { name: 'Silk slip', silhouette: 'Relaxed A-line', measurements: 'Bust 96' },
      10
    );

    expect(updateDesign(database, design.id, { neckline: 'Boat neck' }, 20)).toMatchObject({
      silhouette: 'Relaxed A-line',
      measurements: 'Bust 96',
      neckline: 'Boat neck',
      updatedAt: 20,
    });
  });

  test('clears the description, Category, and Collection', () => {
    const category = createCategory(database, { name: 'Dress' });
    const collection = createCollection(database, { name: 'Resort', year: 2028 });
    const design = createDesign(
      database,
      {
        name: 'Silk slip',
        description: 'Bias cut',
        categoryId: category.id,
        collectionId: collection.id,
      },
      10
    );

    expect(
      updateDesign(
        database,
        design.id,
        { description: null, categoryId: null, collectionId: null },
        20
      )
    ).toMatchObject({
      name: 'Silk slip',
      description: null,
      categoryId: null,
      collectionId: null,
      updatedAt: 20,
    });
    expect(getDesignDetail(database, design.id)).toMatchObject({
      description: null,
      category: null,
      collection: null,
    });
    expect(storedSearchText()).toBe('silk slip');
  });

  test('refuses a blank name and keeps the previous one', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);

    expect(() => updateDesign(database, design.id, { name: '   ' }, 20)).toThrow(
      InvalidDesignNameError
    );

    expect(getDesign(database, design.id)).toMatchObject({
      name: 'Wool coat',
      updatedAt: 10,
    });
  });

  test('accepts the name limit and refuses one character more', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);

    expect(
      updateDesign(database, design.id, { name: 'a'.repeat(DESIGN_NAME_MAX_LENGTH) }, 20)
    ).toMatchObject({ name: 'a'.repeat(DESIGN_NAME_MAX_LENGTH) });
    expect(() =>
      updateDesign(database, design.id, { name: 'a'.repeat(DESIGN_NAME_MAX_LENGTH + 1) }, 30)
    ).toThrow(InvalidDesignNameError);
  });

  test('an update that changes nothing leaves the timestamp alone', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);

    expect(updateDesign(database, design.id, { name: ' Wool coat ' }, 20)).toMatchObject({
      name: 'Wool coat',
      updatedAt: 10,
    });
  });

  test('returns null for a design that is unknown or already gone', () => {
    const design = createDesign(database, { name: 'Wool coat' }, 10);

    database.db
      .update(designs)
      .set({ deletedAt: 15 })
      .where(eq(designs.id, design.id))
      .run();

    expect(updateDesign(database, design.id, { name: 'Linen shirt' }, 20)).toBeNull();
    expect(updateDesign(database, randomUUID(), { name: 'Linen shirt' }, 20)).toBeNull();
  });
});

describe('design detail', () => {
  type DetailDesign = {
    name: string;
    description?: string | null;
    categoryId?: string | null;
    collectionId?: string | null;
    silhouette?: string | null;
    neckline?: string | null;
    sleeveType?: string | null;
    garmentDetails?: string | null;
    sizeRange?: string | null;
    measurements?: string | null;
    constructionNotes?: string | null;
    concept?: string | null;
    mood?: string | null;
    inspiration?: string | null;
    intendedFeeling?: string | null;
    audience?: string | null;
    styling?: string | null;
    palette?: string | null;
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
        silhouette: input.silhouette ?? null,
        neckline: input.neckline ?? null,
        sleeveType: input.sleeveType ?? null,
        garmentDetails: input.garmentDetails ?? null,
        sizeRange: input.sizeRange ?? null,
        measurements: input.measurements ?? null,
        constructionNotes: input.constructionNotes ?? null,
        concept: input.concept ?? null,
        mood: input.mood ?? null,
        inspiration: input.inspiration ?? null,
        intendedFeeling: input.intendedFeeling ?? null,
        audience: input.audience ?? null,
        styling: input.styling ?? null,
        palette: input.palette ?? null,
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
      silhouette: 'Bias cut',
      neckline: 'Cowl neck',
      sleeveType: 'Sleeveless',
      garmentDetails: 'Concealed side zip',
      sizeRange: 'UK 8–16',
      measurements: 'Bust 96',
      constructionNotes: 'French seams',
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
      silhouette: 'Bias cut',
      neckline: 'Cowl neck',
      sleeveType: 'Sleeveless',
      garmentDetails: 'Concealed side zip',
      sizeRange: 'UK 8–16',
      measurements: 'Bust 96',
      constructionNotes: 'French seams',
      concept: null,
      mood: null,
      inspiration: null,
      intendedFeeling: null,
      audience: null,
      styling: null,
      palette: null,
      status: 'approved',
      createdAt: 10,
      updatedAt: 20,
      deletedAt: null,
      materialUses: [],
    });
  });

  test('reads every Creative direction field', () => {
    const id = insertDetailDesign({
      name: 'Sunday Afternoon',
      concept: 'A slow summer day',
      mood: 'Romantic',
      inspiration: 'Summer afternoons',
      intendedFeeling: 'Comfortable but elegant',
      audience: 'Understated dressers',
      styling: 'Sandals',
      palette: 'Ivory and cream',
    });

    expect(getDesignDetail(database, id)).toMatchObject({
      concept: 'A slow summer day',
      mood: 'Romantic',
      inspiration: 'Summer afternoons',
      intendedFeeling: 'Comfortable but elegant',
      audience: 'Understated dressers',
      styling: 'Sandals',
      palette: 'Ivory and cream',
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
