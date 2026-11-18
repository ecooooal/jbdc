import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';
import {
  categories,
  declareLiveRead,
  designs,
  type LiveReadDeclaration,
} from '@/features/database';
import { DatabaseProvider, useLiveRead, type LiveReadResult } from '@/features/database/react';
import { createSyncSubscribe, createTempDatabase } from '@/features/database/testing';

type Counted = { reads: number };
type Database = ReturnType<typeof createTempDatabase>['database'];
type Live = ReturnType<typeof createSyncSubscribe>;

type Seen<Row> = { current: LiveReadResult<Row> | undefined };

/** Observes one declared read through the one hook, in the app's provider seam. */
function Probe<Row extends object>({
  declaration,
  seenRef,
}: {
  declaration: LiveReadDeclaration<Row>;
  seenRef: Seen<Row>;
}) {
  const result = useLiveRead(declaration);

  useEffect(() => {
    seenRef.current = result;
  });

  return null;
}

async function renderDeclaration<Row extends object>(
  declaration: LiveReadDeclaration<Row>,
  database: Database,
  live: Live
) {
  const seenRef: Seen<Row> = { current: undefined };

  await render(
    <DatabaseProvider database={database} subscribe={live.subscribe}>
      <Probe declaration={declaration} seenRef={seenRef} />
    </DatabaseProvider>
  );

  return { seenRef };
}

/**
 * ADR-0005's check: a change to `table` must re-run the declaration's query.
 * The query counts its own runs, so a watched table missing from the
 * declaration leaves the count unchanged and the assertion fails.
 */
async function expectRerunOn(
  declaration: LiveReadDeclaration<Counted>,
  table: string,
  database: Database,
  live: Live
): Promise<void> {
  const { seenRef } = await renderDeclaration(declaration, database, live);
  const before = seenRef.current?.data?.reads;

  await act(async () => live.notify(table));

  expect(seenRef.current?.data?.reads).toBeGreaterThan(before!);
}

let database: Database;
let live: Live;
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  live = createSyncSubscribe();
});

afterEach(() => {
  dispose();
});

test('a declaration re-runs its query when a watched table changes', async () => {
  let reads = 0;
  const declaration = declareLiveRead<Counted>({
    tables: [designs, categories],
    read: () => ({ reads: ++reads }),
    empty: { reads: 0 },
  });

  await expectRerunOn(declaration, 'categories', database, live);
  await expectRerunOn(declaration, 'designs', database, live);
});

test('a declaration missing a joined table fails ADR-0005\'s check', async () => {
  let completeReads = 0;
  let missingReads = 0;

  // Both queries read Categories; only one declares the table it watches.
  const complete = declareLiveRead<Counted>({
    tables: [designs, categories],
    read: () => ({ reads: ++completeReads }),
    empty: { reads: 0 },
  });
  const missing = declareLiveRead<Counted>({
    tables: [designs],
    read: () => ({ reads: ++missingReads }),
    empty: { reads: 0 },
  });

  await expect(expectRerunOn(complete, 'categories', database, live)).resolves.toBeUndefined();
  await expect(expectRerunOn(missing, 'categories', database, live)).rejects.toThrow();
});

test('a failing read keeps the declared default shape and reports error status', async () => {
  const declaration = declareLiveRead<{ names: string[] }>({
    tables: [designs],
    read: () => {
      throw new Error('no catalog');
    },
    empty: { names: [] },
  });

  const { seenRef } = await renderDeclaration(declaration, database, live);

  expect(seenRef.current?.data).toEqual({ names: [] });
  expect(seenRef.current?.status).toBe('error');
  expect(seenRef.current?.error?.message).toBe('no catalog');
});
