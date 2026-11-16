import { render, screen } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { categories, collections } from '@/features/database';
import { DatabaseProvider } from '@/features/database/react';
import { createSyncSubscribe, createTempDatabase } from '@/features/database/testing';
import { createDesign, type DesignFields } from '@/features/designs';
import { recordEdit } from '@/features/history';
import { HistoryScreen } from '@/features/history/react';
import { createCategory, createCollection } from '@/features/taxonomy';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

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
    fields(),
    fields({ name: 'Wool coat', description: 'Heavy twill' }),
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('History')).toBeTruthy();
  expect(screen.getByText('Name: Silk slip dress → Wool coat')).toBeTruthy();
  expect(screen.getByText('Description: None → Heavy twill')).toBeTruthy();
  expect(screen.getByText(/2025/)).toBeTruthy();
});

test('shows the names of the Categories a session changed', async () => {
  const dress = createCategory(database, { name: 'Dress' });
  const knitwear = createCategory(database, { name: 'Knitwear' });
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    fields({ categoryId: dress.id }),
    fields({ categoryId: knitwear.id }),
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
    fields(),
    fields({ categoryId: category.id, collectionId: collection.id }),
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

test('a cleared Category reads as empty', async () => {
  const dress = createCategory(database, { name: 'Dress' });
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  recordEdit(
    database,
    design.id,
    fields({ categoryId: dress.id }),
    fields(),
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('Category: Dress → None')).toBeTruthy();
});

test('a design with no History says so plainly', async () => {
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  await renderHistory(design.id);

  expect(screen.getByText('Nothing has changed yet.')).toBeTruthy();
});
