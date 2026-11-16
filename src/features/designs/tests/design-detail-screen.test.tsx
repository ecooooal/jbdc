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

  expect(screen.getByText('Dress')).toBeTruthy();

  database.db
    .update(categories)
    .set({ name: 'Knitwear' })
    .where(eq(categories.id, category.id))
    .run();

  await act(async () => live.notify('categories'));

  expect(screen.getByText('Knitwear')).toBeTruthy();
});
