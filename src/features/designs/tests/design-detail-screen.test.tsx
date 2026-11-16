import { act, render, screen, userEvent } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { categories } from '@/features/database';
import { DatabaseProvider } from '@/features/database/react';
import { createSyncSubscribe, createTempDatabase } from '@/features/database/testing';
import { createDesign } from '@/features/designs';
import { DesignDetailScreen } from '@/features/designs/react';
import { createCategory } from '@/features/taxonomy';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

let database: ReturnType<typeof createTempDatabase>['database'];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  jest.clearAllMocks();
});

afterEach(() => {
  dispose();
});

async function renderDetail(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <DesignDetailScreen designId={designId} />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

test("Detail opens that Design's History", async () => {
  const design = createDesign(database, { name: 'Silk slip dress' });

  await renderDetail(design.id);

  await userEvent.press(screen.getByRole('button', { name: 'History' }));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/designs/[id]/history',
    params: { id: design.id },
  });
});

test("renaming the Design's Category re-reads Detail", async () => {
  const category = createCategory(database, { name: 'Dress' });
  const design = createDesign(database, {
    name: 'Silk slip dress',
    categoryId: category.id,
  });

  await renderDetail(design.id);

  expect(screen.getByText('Dress · No collection')).toBeTruthy();

  database.db
    .update(categories)
    .set({ name: 'Knitwear' })
    .where(eq(categories.id, category.id))
    .run();

  await act(async () => live.notify('categories'));

  expect(screen.getByText('Knitwear · No collection')).toBeTruthy();
});

test('Detail renders the hero and the recorded Specification read-only', async () => {
  const design = createDesign(database, {
    name: 'Silk slip dress',
    description: 'Bias cut, cowl neck.',
    silhouette: 'Relaxed A-line',
    measurements: 'Bust 96 / waist 104',
  });

  await renderDetail(design.id);

  expect(screen.getByText('Silk slip dress')).toBeTruthy();
  expect(screen.getByText('No category · No collection')).toBeTruthy();
  expect(screen.getByText('Bias cut, cowl neck.')).toBeTruthy();
  expect(screen.getByText('Specification')).toBeTruthy();
  expect(screen.getByText('Relaxed A-line')).toBeTruthy();
  expect(screen.getByText('Bust 96 / waist 104')).toBeTruthy();
  expect(screen.getByText('Created')).toBeTruthy();
});

test('Detail hides Specification rows the owner has not recorded', async () => {
  const design = createDesign(database, { name: 'Silk slip dress', neckline: 'Boat neck' });

  await renderDetail(design.id);

  expect(screen.getByText('Neckline')).toBeTruthy();
  expect(screen.queryByText('Silhouette')).toBeNull();
  expect(screen.queryByText('Measurements')).toBeNull();
  expect(screen.queryByText('Not set')).toBeNull();
});

test('a design that has recorded nothing shows no tab content', async () => {
  const design = createDesign(database, { name: 'Unfinished idea' });

  await renderDetail(design.id);

  expect(screen.getByText('Nothing recorded yet')).toBeTruthy();
  expect(screen.queryByText('Specification')).toBeNull();
});
