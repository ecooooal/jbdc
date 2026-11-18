import { render, screen, within } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { categories, collections } from '@/features/database';
import { DatabaseProvider } from '@/features/database/react';
import { createSyncSubscribe, createTempDatabase } from '@/features/database/testing';
import { createDesign, writeDesign, type DesignFields, type MaterialUse } from '@/features/designs';
import { recordEdit } from '@/features/history';
import { HistoryScreen } from '@/features/history/react';
import { createMaterial } from '@/features/materials';
import { createCategory, createCollection } from '@/features/taxonomy';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

/** Seeds a recorded use through the visit's one write path. */
function addMaterialUse(
  database: ReturnType<typeof createTempDatabase>['database'],
  designId: string,
  input: { materialId: string; colour: string; role: 'main' | 'secondary' | 'other' },
  now?: number
): MaterialUse | null {
  return writeDesign(database, designId, { uses: [{ kind: 'add', input }] }, now)?.added[0] ?? null;
}

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

/** The fields of a Design before an edit; overrides say what changed. */
function fields(overrides: Partial<DesignFields> = {}): DesignFields {
  return {
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
    ...overrides,
  };
}

let database: ReturnType<typeof createTempDatabase>['database'];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

async function renderHistory(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <HistoryScreen designId={designId} />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

test('shows what changed, the old value, the new value, and when', async () => {
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    {
      before: fields(),
      after: fields({ name: 'Wool coat', description: 'Heavy twill' }),
    },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('History')).toBeTruthy();
  expect(screen.getByText('Name: Silk slip dress → Wool coat')).toBeTruthy();
  expect(screen.getByText('Description: None → Heavy twill')).toBeTruthy();
  expect(screen.getByText(/2025/)).toBeTruthy();
});

test('shows the names of the Categories a visit changed', async () => {
  const dress = createCategory(database, { name: 'Dress' });
  const knitwear = createCategory(database, { name: 'Knitwear' });
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    {
      before: fields({ categoryId: dress.id }),
      after: fields({ categoryId: knitwear.id }),
    },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('Category: Dress → Knitwear')).toBeTruthy();
});

test('keeps the names of a Category and Collection deleted after the edit', async () => {
  const category = createCategory(database, { name: 'Dress' });
  const collection = createCollection(database, { name: 'Spring', year: 2027 });
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    {
      before: fields(),
      after: fields({ categoryId: category.id, collectionId: collection.id }),
    },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  database.db
    .update(categories)
    .set({ deletedAt: Date.UTC(2025, 0, 3) })
    .where(eq(categories.id, category.id))
    .run();
  database.db
    .update(collections)
    .set({ deletedAt: Date.UTC(2025, 0, 3) })
    .where(eq(collections.id, collection.id))
    .run();

  await renderHistory(design.id);

  expect(screen.getByText('Category: None → Dress')).toBeTruthy();
  expect(screen.getByText('Collection: None → Spring (2027)')).toBeTruthy();
  expect(screen.queryByText(/Unknown Category/)).toBeNull();
  expect(screen.queryByText(/Unknown Collection/)).toBeNull();
});

test('shows a Collection created without a year by its bare name', async () => {
  const collection = createCollection(database, { name: 'Spring' });
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    {
      before: fields(),
      after: fields({ collectionId: collection.id }),
    },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('Collection: None → Spring')).toBeTruthy();
});

test('a cleared Category reads as empty', async () => {
  const dress = createCategory(database, { name: 'Dress' });
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    { before: fields({ categoryId: dress.id }), after: fields() },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('Category: Dress → None')).toBeTruthy();
});

test('shows a Specification change by its owner-facing label', async () => {
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    {
      before: fields(),
      after: fields({ silhouette: 'Relaxed A-line', measurements: 'Bust 96' }),
    },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('Silhouette: None → Relaxed A-line')).toBeTruthy();
  expect(screen.getByText('Measurements: None → Bust 96')).toBeTruthy();
});

test('groups a card under Identity, Specification, Creative direction, and Materials', async () => {
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);
  const wool = createMaterial(database, { name: 'Wool' });
  const materialUse = addMaterialUse(
    database,
    design.id,
    { materialId: wool.id, colour: 'Charcoal', role: 'main' },
    10
  );

  if (!materialUse) throw new Error('the Material use should have been written');

  recordEdit(
    database,
    design.id,
    {
      before: fields(),
      after: fields({
        description: 'Heavy twill',
        silhouette: 'Relaxed A-line',
        mood: 'Romantic, relaxed',
      }),
      materialUses: { before: [], after: [materialUse] },
    },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(
    within(screen.getByTestId('history-section-identity')).getByText(
      'Description: None → Heavy twill'
    )
  ).toBeTruthy();
  expect(
    within(screen.getByTestId('history-section-specification')).getByText(
      'Silhouette: None → Relaxed A-line'
    )
  ).toBeTruthy();
  expect(
    within(screen.getByTestId('history-section-creativeDirection')).getByText(
      'Mood: None → Romantic, relaxed'
    )
  ).toBeTruthy();
  expect(
    within(screen.getByTestId('history-section-materials')).getByText(/ added$/)
  ).toBeTruthy();
});

test('a section with nothing changed is not shown', async () => {
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    { before: fields(), after: fields({ silhouette: 'Relaxed A-line' }) },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByTestId('history-section-specification')).toBeTruthy();
  expect(screen.queryByTestId('history-section-identity')).toBeNull();
  expect(screen.queryByTestId('history-section-creativeDirection')).toBeNull();
  expect(screen.queryByTestId('history-section-materials')).toBeNull();
});

test('a design with no History says so plainly', async () => {
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  await renderHistory(design.id);

  expect(screen.getByText('Nothing has changed yet.')).toBeTruthy();
});
