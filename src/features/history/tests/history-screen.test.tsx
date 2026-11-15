import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, type LiveQuery } from '@/features/database/react';
import { createTempDatabase } from '@/features/database/testing';
import { createDesign } from '@/features/designs';
import { appendEditEvent } from '@/features/history';
import { HistoryScreen } from '@/features/history/react';
import { createCategory } from '@/features/taxonomy';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const syncLiveQuery = ((query: { all(): unknown[] }) => ({
  data: query.all(),
  error: undefined,
  updatedAt: new Date(0),
})) as unknown as LiveQuery;

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
      <DatabaseProvider database={database} liveQuery={syncLiveQuery}>
        <HistoryScreen designId={designId} />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

test('shows what changed, the old value, the new value, and when', async () => {
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  appendEditEvent(
    database,
    design.id,
    {
      name: { from: 'Silk slip dress', to: 'Wool coat' },
      description: { from: null, to: 'Heavy twill' },
    },
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

  appendEditEvent(
    database,
    design.id,
    { categoryId: { from: dress.id, to: knitwear.id } },
    Date.UTC(2025, 0, 2, 3, 4)
  );

  await renderHistory(design.id);

  expect(screen.getByText('Category: Dress → Knitwear')).toBeTruthy();
});

test('a cleared Category reads as empty', async () => {
  const dress = createCategory(database, { name: 'Dress' });
  const design = createDesign(database, { name: 'Silk slip dress' }, 10);

  appendEditEvent(
    database,
    design.id,
    { categoryId: { from: dress.id, to: null } },
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
