import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, type LiveQuery } from '@/features/database/react';
import { createTempDatabase } from '@/features/database/testing';
import { createDesign } from '@/features/designs';
import { DesignDetailScreen } from '@/features/designs/react';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

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
  jest.clearAllMocks();
});

afterEach(() => {
  dispose();
});

async function renderDetail(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} liveQuery={syncLiveQuery}>
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
