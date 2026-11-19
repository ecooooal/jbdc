import { render } from '@testing-library/react-native';
import { useEffect } from 'react';
import {
  categories,
  declareLiveRead,
  type Database,
  type LiveReadDeclaration,
  type LiveReadTable,
} from '@/features/database';
import { DatabaseProvider, useLiveRead, type LiveReadResult } from '@/features/database/react';
import { createSyncSubscribe, createTempDatabase } from '@/features/database/testing';
import { expectLiveReadReruns } from '@/features/database/testing-live';

type Names = { names: string[] };
type Seen<Row> = { current: LiveReadResult<Row> | undefined };

function addCategory(database: Database, name: string): void {
  database.db
    .insert(categories)
    .values({ id: database.newId(), name, createdAt: 0 })
    .run();
}

/** A real read over Categories, declaring exactly the tables it is handed. */
function readsCategoryNames(tables: readonly LiveReadTable[]) {
  return declareLiveRead<Names>({
    tables,
    read: (database) => ({
      names: database.db
        .select({ name: categories.name })
        .from(categories)
        .all()
        .map((row) => row.name),
    }),
    empty: { names: [] },
  });
}

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

let database: Database;
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

test('a live read re-runs when a watched table changes', async () => {
  const declaration = readsCategoryNames([categories]);

  await expectLiveReadReruns(declaration, categories, database, (database) => {
    addCategory(database, 'Knitwear');
  });
});

test('a live read that does not declare a table it reads fails the check', async () => {
  const complete = readsCategoryNames([categories]);
  const missing = readsCategoryNames([]);
  const change = (database: Database) => addCategory(database, 'Knitwear');

  await expect(expectLiveReadReruns(complete, categories, database, change)).resolves.toBeUndefined();
  await expect(expectLiveReadReruns(missing, categories, database, change)).rejects.toThrow();
});

test('a failing read keeps the declared default shape and reports error status', async () => {
  const declaration = declareLiveRead<Names>({
    tables: [categories],
    read: () => {
      throw new Error('no catalog');
    },
    empty: { names: [] },
  });
  const seenRef: Seen<Names> = { current: undefined };
  const live = createSyncSubscribe();

  await render(
    <DatabaseProvider database={database} subscribe={live.subscribe}>
      <Probe declaration={declaration} seenRef={seenRef} />
    </DatabaseProvider>
  );

  expect(seenRef.current?.data).toEqual({ names: [] });
  expect(seenRef.current?.status).toBe('error');
  expect(seenRef.current?.error?.message).toBe('no catalog');
});
