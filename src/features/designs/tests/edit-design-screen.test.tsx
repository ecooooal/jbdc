import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@/features/database/react';
import { createSyncSubscribe, createTempDatabase } from '@/features/database/testing';
import { createDesign, getDesign } from '@/features/designs';
import { EditDesignScreen } from '@/features/designs/react';
import { listDesignEvents } from '@/features/history';
import { createCategory, createCollection } from '@/features/taxonomy';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

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
      <DatabaseProvider database={database} subscribe={live.subscribe}>
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

test('a name typed but not left is written when the screen closes', async () => {
  const design = newDesign();
  const view = await renderEdit(design.id);

  await fireEvent.changeText(screen.getByLabelText('Design name'), 'Wool coat');
  await view.unmount();

  expect(getDesign(database, design.id)).toMatchObject({ name: 'Wool coat' });
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

describe('edit session history', () => {
  test('two fields changed in one session are one Event with both old and new values', async () => {
    const design = newDesign();
    const view = await renderEdit(design.id);

    await fireEvent.changeText(screen.getByLabelText('Design name'), 'Wool coat');
    await fireEvent.changeText(screen.getByLabelText('Design description'), 'Heavy twill');
    await view.unmount();

    const events = listDesignEvents(database, design.id);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'edit',
      diff: {
        name: { from: 'Silk slip dress', to: 'Wool coat' },
        description: { from: 'Bias cut', to: 'Heavy twill' },
      },
    });
  });

  test('a session that changes nothing writes no Event', async () => {
    const design = newDesign();
    const view = await renderEdit(design.id);

    await view.unmount();

    expect(listDesignEvents(database, design.id)).toEqual([]);
  });

  test('two separate sessions write two Events', async () => {
    const design = newDesign();

    const first = await renderEdit(design.id);
    await fireEvent.changeText(screen.getByLabelText('Design name'), 'Wool coat');
    await first.unmount();

    const second = await renderEdit(design.id);
    await fireEvent.changeText(screen.getByLabelText('Design description'), 'Heavy twill');
    await second.unmount();

    expect(listDesignEvents(database, design.id).map((event) => event.diff)).toEqual([
      { description: { from: 'Bias cut', to: 'Heavy twill' } },
      { name: { from: 'Silk slip dress', to: 'Wool coat' } },
    ]);
  });

  test('leaving the app keeps the draft and records nothing; closing writes one Event', async () => {
    const design = newDesign();
    const listeners: ((status: string) => void)[] = [];
    const addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(((_type: string, handler: (status: string) => void) => {
        listeners.push(handler);

        return { remove: jest.fn() };
      }) as never);

    const view = await renderEdit(design.id);
    await fireEvent.changeText(screen.getByLabelText('Design name'), 'Wool coat');

    // Opening Control Centre or the app switcher only makes the app inactive.
    await act(async () => listeners[0]('inactive'));
    expect(getDesign(database, design.id)).toMatchObject({ name: 'Wool coat' });
    expect(listDesignEvents(database, design.id)).toEqual([]);

    // Leaving the app flushes a draft, but the visit is still open.
    await act(async () => listeners[0]('background'));
    expect(listDesignEvents(database, design.id)).toEqual([]);

    await view.unmount();
    addEventListener.mockRestore();

    const events = listDesignEvents(database, design.id);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      diff: { name: { from: 'Silk slip dress', to: 'Wool coat' } },
    });
  });
});
