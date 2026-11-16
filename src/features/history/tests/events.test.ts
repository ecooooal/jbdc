import { createTempDatabase } from '@/features/database/testing';
import type { DesignFields } from '@/features/designs';
import { addMaterialUse, createDesign } from '@/features/designs';
import { diffDesignFields, listDesignEvents, recordEdit } from '@/features/history';
import { createMaterial } from '@/features/materials';

const BEFORE: DesignFields = {
  name: 'Silk slip dress',
  description: 'Bias cut',
  categoryId: 'category-dress',
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
};

describe('diffDesignFields', () => {
  test('nothing changed is no diff at all', () => {
    expect(diffDesignFields(BEFORE, { ...BEFORE })).toBeNull();
  });

  test('names exactly the changed fields with their old and new values', () => {
    expect(
      diffDesignFields(BEFORE, {
        ...BEFORE,
        name: 'Wool coat',
        collectionId: 'collection-spring',
      })
    ).toEqual({
      name: { from: 'Silk slip dress', to: 'Wool coat' },
      collectionId: { from: null, to: 'collection-spring' },
    });
  });

  test('a field emptied records null as its new value', () => {
    expect(diffDesignFields(BEFORE, { ...BEFORE, description: null })).toEqual({
      description: { from: 'Bias cut', to: null },
    });
  });

  test('a field filled in for the first time records null as its old value', () => {
    expect(diffDesignFields(BEFORE, { ...BEFORE, collectionId: 'collection-spring' })).toEqual({
      collectionId: { from: null, to: 'collection-spring' },
    });
  });
});

describe('recordEdit', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test('an edit session appends one event whose diff reads as an object', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    const event = recordEdit(
      database,
      design.id,
      {
        before: BEFORE,
        after: { ...BEFORE, name: 'Wool coat', collectionId: 'collection-spring' },
      },
      20
    );

    expect(event).toMatchObject({
      designId: design.id,
      kind: 'edit',
      reason: null,
      potentialImprovements: null,
      diff: {
        name: { from: 'Silk slip dress', to: 'Wool coat' },
        collectionId: { from: null, to: 'collection-spring' },
      },
      createdAt: 20,
    });
    expect(listDesignEvents(database, design.id)).toEqual([event]);
  });

  test('a session that only adds a Material use still writes one event', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const use = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    );

    if (!use) throw new Error('the Material use should have been written');

    const event = recordEdit(
      database,
      design.id,
      { before: BEFORE, after: BEFORE, addedMaterialUses: [use] },
      30
    );

    expect(event?.diff).toEqual({
      materialUses: {
        added: [
          {
            id: use.id,
            materialId: wool.id,
            materialName: 'Wool',
            colour: 'Charcoal',
            role: 'main',
          },
        ],
      },
    });
  });

  test('a session that changed nothing writes no event', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    expect(recordEdit(database, design.id, { before: BEFORE, after: { ...BEFORE } }, 20)).toBeNull();
    expect(listDesignEvents(database, design.id)).toEqual([]);
  });

  test('two sessions are two events, both kept as written', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);
    const renamed = { ...BEFORE, name: 'Silk slip' };

    recordEdit(database, design.id, { before: BEFORE, after: renamed }, 20);
    recordEdit(database, design.id, { before: renamed, after: { ...renamed, description: 'Heavy twill' } }, 30);

    expect(listDesignEvents(database, design.id).map((event) => event.diff)).toEqual([
      { description: { from: 'Bias cut', to: 'Heavy twill' } },
      { name: { from: 'Silk slip dress', to: 'Silk slip' } },
    ]);
  });

  test('reads newest first', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);
    const renamed = { ...BEFORE, name: 'Silk slip' };

    recordEdit(database, design.id, { before: BEFORE, after: renamed }, 20);
    recordEdit(database, design.id, { before: renamed, after: { ...renamed, name: 'Silk slip dress' } }, 30);

    expect(listDesignEvents(database, design.id).map((event) => event.createdAt)).toEqual([
      30, 20,
    ]);
  });

  test('two events in the same millisecond read in the order they were written', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);
    const renamed = { ...BEFORE, name: 'Silk slip' };

    recordEdit(database, design.id, { before: BEFORE, after: renamed }, 20);
    recordEdit(database, design.id, { before: renamed, after: { ...renamed, name: 'Silk slip dress' } }, 20);

    expect(listDesignEvents(database, design.id).map((event) => event.diff)).toEqual([
      { name: { from: 'Silk slip', to: 'Silk slip dress' } },
      { name: { from: 'Silk slip dress', to: 'Silk slip' } },
    ]);
  });

  test('events of one design are kept apart from another design', () => {
    const first = createDesign(database, { name: 'Silk slip dress' }, 10);
    const second = createDesign(database, { name: 'Wool coat' }, 10);

    recordEdit(database, first.id, { before: BEFORE, after: { ...BEFORE, name: 'Silk slip' } }, 20);

    expect(listDesignEvents(database, second.id)).toEqual([]);
  });
});
