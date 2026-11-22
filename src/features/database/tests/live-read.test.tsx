import { renderHook } from "@testing-library/react-native";
import {
  categories,
  declareLiveRead,
  type Database,
  type LiveReadTable,
} from "@/features/database";
import { DatabaseProvider, useLiveRead } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { expectLiveReadReruns } from "@/features/database/testing-live";

type Names = { names: string[] };

function addCategory(database: Database, name: string): void {
  database.db.insert(categories).values({ id: database.newId(), name, createdAt: 0 }).run();
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

let database: Database;
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

test("a live read re-runs when a watched table changes", async () => {
  const declaration = readsCategoryNames([categories]);

  await expectLiveReadReruns(declaration, categories, database, (database) => {
    addCategory(database, "Knitwear");
  });
});

test("a live read that does not declare a table it reads fails the check", async () => {
  const complete = readsCategoryNames([categories]);
  const missing = readsCategoryNames([]);
  const change = (database: Database) => addCategory(database, "Knitwear");

  await expect(
    expectLiveReadReruns(complete, categories, database, change),
  ).resolves.toBeUndefined();
  await expect(expectLiveReadReruns(missing, categories, database, change)).rejects.toThrow();
});

test("a failing read keeps the declared default shape and reports error status", async () => {
  const declaration = declareLiveRead<Names>({
    tables: [categories],
    read: () => {
      throw new Error("no catalog");
    },
    empty: { names: [] },
  });
  const live = createSyncSubscribe();

  const { result } = await renderHook(() => useLiveRead(declaration), {
    wrapper: ({ children }) => (
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        {children}
      </DatabaseProvider>
    ),
  });

  expect(result.current.data).toEqual({ names: [] });
  expect(result.current.status).toBe("error");
  expect(result.current.error?.message).toBe("no catalog");
});
