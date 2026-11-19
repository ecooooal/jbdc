import { randomUUID } from 'node:crypto';
import {
  categories,
  collections,
  designMaterials,
  designs,
  materials,
  type DesignStatus,
} from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import { createDesign, designDetailRead, getDesignDetail } from '@/features/designs';

let database: ReturnType<typeof createTempDatabase>['database'];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

describe('the Detail live read', () => {
  test('declares every table it watches beside the query and one row shape', () => {
    const design = createDesign(database, { name: 'Wool coat' });
    const declaration = designDetailRead(design.id);

    expect(declaration.tables).toEqual([
      designs,
      categories,
      collections,
      designMaterials,
      materials,
    ]);
    expect(declaration.empty).toEqual({ design: null });
    expect(declaration.read(database)).toEqual({ design: getDesignDetail(database, design.id) });
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
      collection: 'Spring 2027 (2027)',
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

  test('shows a Collection carrying a year with the year in its label', () => {
    const collectionId = randomUUID();

    database.db
      .insert(collections)
      .values({ id: collectionId, name: 'Spring', year: 2027, createdAt: 0 })
      .run();

    const id = insertDetailDesign({ name: 'Silk slip', collectionId });

    expect(getDesignDetail(database, id)?.collection).toBe('Spring (2027)');
  });

  test('shows a Collection stored without a year by its bare name', () => {
    const collectionId = randomUUID();

    database.db
      .insert(collections)
      .values({ id: collectionId, name: 'Spring', year: null, createdAt: 0 })
      .run();

    const id = insertDetailDesign({ name: 'Silk slip', collectionId });

    expect(getDesignDetail(database, id)?.collection).toBe('Spring');
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
