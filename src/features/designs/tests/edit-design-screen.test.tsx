import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, type LiveQuery } from '@/features/database/react';
import { createTempDatabase } from '@/features/database/testing';
import { createDesign, getDesign } from '@/features/designs';
import { EditDesignScreen } from '@/features/designs/react';
import { createCategory, createCollection } from '@/features/taxonomy';

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

let database: ReturnType<typeof createTempDatabase>['database'];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

async function renderEdit(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} liveQuery={syncLiveQuery}>
        <EditDesignScreen designId={designId} />
        <PortalHost />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

function newDesign() {
  return createDesign(database, {
    name: 'Silk slip dress',
    description: 'Bias cut',
  });
}

test('a name typed and left is stored with no Save action', async () => {
  const design = newDesign();

  await renderEdit(design.id);

  const name = screen.getByLabelText('Design name');

  await fireEvent.changeText(name, 'Wool coat');
  await fireEvent(name, 'blur');

  expect(getDesign(database, design.id)).toMatchObject({ name: 'Wool coat' });
  expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
});

test('a blank name is refused and the previous name stays', async () => {
  const design = newDesign();

  await renderEdit(design.id);

  const name = screen.getByLabelText('Design name');

  await fireEvent.changeText(name, '   ');
  await fireEvent(name, 'blur');

  expect(screen.getByText('A design needs a name.')).toBeTruthy();
  expect(screen.getByLabelText('Design name')).toHaveDisplayValue('Silk slip dress');
  expect(getDesign(database, design.id)).toMatchObject({ name: 'Silk slip dress' });
});

test('a description typed and left is stored', async () => {
  const design = newDesign();

  await renderEdit(design.id);

  const description = screen.getByLabelText('Design description');

  await fireEvent.changeText(description, 'Heavy twill, wide lapels');
  await fireEvent(description, 'blur');

  expect(getDesign(database, design.id)).toMatchObject({
    description: 'Heavy twill, wide lapels',
  });
});

test('shows the Category and Collection already on the design', async () => {
  const category = createCategory(database, { name: 'Dress' });
  const collection = createCollection(database, { name: 'Spring 2027', year: 2027 });
  const design = createDesign(database, {
    name: 'Silk slip dress',
    categoryId: category.id,
    collectionId: collection.id,
  });

  await renderEdit(design.id);

  expect(screen.getByText('Dress')).toBeTruthy();
  expect(screen.getByText('Spring 2027 (2027)')).toBeTruthy();
});
