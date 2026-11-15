import { createTempDatabase } from '@/features/database/testing';
import { createDesign } from '@/features/designs';
import {
  appendEditEvent,
  diffDesignFields,
  listDesignEvents,
  type DesignFieldValues,
} from '@/features/history';

const BEFORE: DesignFieldValues = {
  name: 'Silk slip dress',
  description: 'Bias cut',
  categoryId: 'category-dress',
  collectionId: null,
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

describe('design events', () => {
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
    const diff = diffDesignFields(
      BEFORE,
      { ...BEFORE, name: 'Wool coat', collectionId: 'collection-spring' }
    );

    const event = appendEditEvent(database, design.id, diff ?? {}, 20);

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

  test('a session that changed nothing writes no event', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    expect(appendEditEvent(database, design.id, {}, 20)).toBeNull();
    expect(listDesignEvents(database, design.id)).toEqual([]);
  });

  test('two sessions are two events, both kept as written', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    appendEditEvent(
      database,
      design.id,
      { name: { from: 'Silk slip dress', to: 'Silk slip' } },
      20
    );
    appendEditEvent(
      database,
      design.id,
      { description: { from: 'Bias cut', to: 'Heavy twill' } },
      30
    );

    expect(listDesignEvents(database, design.id).map((event) => event.diff)).toEqual([
      { description: { from: 'Bias cut', to: 'Heavy twill' } },
      { name: { from: 'Silk slip dress', to: 'Silk slip' } },
    ]);
  });

  test('reads newest first', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    appendEditEvent(database, design.id, { name: { from: 'A', to: 'B' } }, 20);
    appendEditEvent(database, design.id, { name: { from: 'B', to: 'C' } }, 30);

    expect(listDesignEvents(database, design.id).map((event) => event.createdAt)).toEqual([
      30, 20,
    ]);
  });

  test('two events in the same millisecond read in the order they were written', () => {
    const design = createDesign(database, { name: 'Silk slip dress' }, 10);

    appendEditEvent(database, design.id, { name: { from: 'A', to: 'B' } }, 20);
    appendEditEvent(database, design.id, { name: { from: 'B', to: 'C' } }, 20);

    expect(listDesignEvents(database, design.id).map((event) => event.diff)).toEqual([
      { name: { from: 'B', to: 'C' } },
      { name: { from: 'A', to: 'B' } },
    ]);
  });

  test('events of one design are kept apart from another design', () => {
    const first = createDesign(database, { name: 'Silk slip dress' }, 10);
    const second = createDesign(database, { name: 'Wool coat' }, 10);

    appendEditEvent(database, first.id, { name: { from: 'A', to: 'B' } }, 20);

    expect(listDesignEvents(database, second.id)).toEqual([]);
  });
});
