import { designEvents } from '@/features/database';
import { createTempDatabase } from '@/features/database/testing';
import type { DesignFields, MaterialUse } from '@/features/designs';
import { addMaterialUse, createDesign } from '@/features/designs';
import {
  diffDesignFields,
  diffMaterialUses,
  listDesignEvents,
  materialUseLines,
  recordEdit,
} from '@/features/history';
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

const WOOL_USE: MaterialUse = {
  id: 'use-wool',
  designId: 'design-silk-slip',
  materialId: 'material-wool',
  materialName: 'Wool',
  colour: 'Charcoal',
  role: 'main',
  createdAt: 10,
};

/** A Material use without what History never stores. */
function changeOf(materialUse: MaterialUse) {
  return {
    id: materialUse.id,
    materialId: materialUse.materialId,
    materialName: materialUse.materialName,
    colour: materialUse.colour,
    role: materialUse.role,
  };
}

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

describe('diffMaterialUses', () => {
  test('records a use the visit added', () => {
    expect(diffMaterialUses([], [WOOL_USE])).toEqual({ added: [changeOf(WOOL_USE)] });
  });

  test('records a use the visit removed', () => {
    expect(diffMaterialUses([WOOL_USE], [])).toEqual({ removed: [changeOf(WOOL_USE)] });
  });

  test('records a use the visit corrected, with what it was and what it became', () => {
    const blackWool: MaterialUse = { ...WOOL_USE, colour: 'Black', role: 'secondary' };

    expect(diffMaterialUses([WOOL_USE], [blackWool])).toEqual({
      changed: [{ from: changeOf(WOOL_USE), to: changeOf(blackWool) }],
    });
  });

  test('leaves an unchanged visit out', () => {
    expect(diffMaterialUses([WOOL_USE], [{ ...WOOL_USE }])).toBeNull();
  });
});

describe('materialUseLines', () => {
  test('an added use reads as its name, colour, role, and change', () => {
    expect(materialUseLines({ added: [changeOf(WOOL_USE)] })).toEqual([
      { key: `added:${WOOL_USE.id}`, text: 'Wool (Charcoal, main) added' },
    ]);
  });

  test('a removed use reads as what was taken away', () => {
    expect(materialUseLines({ removed: [changeOf(WOOL_USE)] })).toEqual([
      { key: `removed:${WOOL_USE.id}`, text: 'Wool (Charcoal, main) removed' },
    ]);
  });

  test('a corrected use reads from what it was to what it became', () => {
    const blackWool: MaterialUse = { ...WOOL_USE, colour: 'Black', role: 'secondary' };

    expect(
      materialUseLines({
        changed: [{ from: changeOf(WOOL_USE), to: changeOf(blackWool) }],
      })
    ).toEqual([
      {
        key: `changed:${WOOL_USE.id}`,
        text: 'Wool (Charcoal, main) changed to Wool (Black, secondary)',
      },
    ]);
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

  test('an edit visit appends one event whose diff reads as an object', () => {
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

  test('one visit that changes fields and Material uses writes one Event carrying both', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);
    const silk = createMaterial(database, { name: 'Silk crêpe' });
    const ivory = addMaterialUse(
      database,
      design.id,
      { materialId: silk.id, colour: 'Ivory', role: 'main' },
      15
    );

    if (!ivory) throw new Error('the Material use should have been written');

    const black = { ...ivory, colour: 'Black' };

    const event = recordEdit(
      database,
      design.id,
      {
        before: BEFORE,
        after: { ...BEFORE, name: 'Wool coat' },
        materialUses: { before: [ivory], after: [black] },
      },
      20
    );

    expect(event?.diff).toEqual({
      name: { from: 'Silk slip dress', to: 'Wool coat' },
      materials: {
        changed: [{ from: changeOf(ivory), to: changeOf(black) }],
      },
    });
    expect(listDesignEvents(database, design.id)).toEqual([event]);
  });

  test('a visit that only adds a Material use still writes one event', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);
    const wool = createMaterial(database, { name: 'Wool' });
    const materialUse = addMaterialUse(
      database,
      design.id,
      { materialId: wool.id, colour: 'Charcoal', role: 'main' },
      20
    );

    if (!materialUse) throw new Error('the Material use should have been written');

    const event = recordEdit(
      database,
      design.id,
      { before: BEFORE, after: BEFORE, materialUses: { before: [], after: [materialUse] } },
      30
    );

    expect(event?.diff).toEqual({
      materials: {
        added: [
          {
            id: materialUse.id,
            materialId: wool.id,
            materialName: 'Wool',
            colour: 'Charcoal',
            role: 'main',
          },
        ],
      },
    });
  });

  test('an Event written before the materials key still reads its Material use', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    database.db
      .insert(designEvents)
      .values({
        id: 'event-old',
        designId: design.id,
        kind: 'edit',
        reason: null,
        potentialImprovements: null,
        diff: JSON.stringify({
          name: { from: 'Silk slip dress', to: 'Wool coat' },
          materialUses: { added: [changeOf(WOOL_USE)] },
        }),
        createdAt: 20,
      })
      .run();

    expect(listDesignEvents(database, design.id)[0].diff).toEqual({
      name: { from: 'Silk slip dress', to: 'Wool coat' },
      materials: { added: [changeOf(WOOL_USE)] },
    });
  });

  test('a visit that changed nothing writes no event', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    expect(recordEdit(database, design.id, { before: BEFORE, after: { ...BEFORE } }, 20)).toBeNull();
    expect(listDesignEvents(database, design.id)).toEqual([]);
  });

  test('an unchanged Material uses pair writes no event either', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    expect(
      recordEdit(
        database,
        design.id,
        {
          before: BEFORE,
          after: { ...BEFORE },
          materialUses: { before: [WOOL_USE], after: [WOOL_USE] },
        },
        20
      )
    ).toBeNull();
    expect(listDesignEvents(database, design.id)).toEqual([]);
  });

  test('two visits are two events, both kept as written', () => {
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
