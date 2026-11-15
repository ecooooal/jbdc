import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, type LiveQuery } from '@/features/database/react';
import { createTempDatabase } from '@/features/database/testing';
import { listDesigns } from '@/features/designs';
import { NewDesignForm } from '@/features/designs/react';
import { listCategories } from '@/features/taxonomy';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The test adapter for the live-query seam: re-read each render, synchronously. */
const syncLiveQuery = ((query: { all(): unknown[] }) => ({
  data: query.all(),
  error: undefined,
  updatedAt: new Date(0),
})) as unknown as LiveQuery;

test('a category created inline is selected and saved with the design', async () => {
  const { database, dispose } = createTempDatabase();
  const user = userEvent.setup();

  try {
    await render(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <DatabaseProvider database={database} liveQuery={syncLiveQuery}>
          <NewDesignForm />
        </DatabaseProvider>
      </SafeAreaProvider>
    );

    await user.type(screen.getByLabelText('Design name'), 'Silk slip dress');
    await user.press(screen.getByRole('button', { name: 'New category' }));
    await user.type(screen.getByLabelText('New category name'), 'Knitwear');
    await user.press(screen.getByRole('button', { name: 'Add category' }));

    expect(screen.getByText('Knitwear')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Create' }));

    const category = listCategories(database).find((entry) => entry.name === 'Knitwear');

    expect(listDesigns(database)).toEqual([
      expect.objectContaining({ name: 'Silk slip dress', categoryId: category?.id }),
    ]);
    expect(router.back).toHaveBeenCalled();
  } finally {
    dispose();
  }
});
