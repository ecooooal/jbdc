import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { openAppDatabaseWithLiveReads } from './expo';
import {
  liveReadTableName,
  type LiveReadDeclaration,
  type LiveReadSubscribe,
  type LiveReadTable,
} from './lib/live-read';
import type { Database } from './lib/port';

export type LiveReadStatus = 'loading' | 'ready' | 'error';

export type LiveReadResult<Row> = {
  data: Row | undefined;
  error: Error | undefined;
  status: LiveReadStatus;
};

/** The pre-declaration input, kept while the five reads migrate one step at a time. */
type LegacyLiveRead<Row> = {
  tables: readonly LiveReadTable[];
  run: () => Row;
};

const DatabaseContext = createContext<Database | null>(null);
const SubscribeContext = createContext<LiveReadSubscribe | null>(null);

const NO_SUBSCRIBE: LiveReadSubscribe = () => () => {};

function toError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught));
}

/**
 * The one hook every live read uses. It owns the subscription and the status;
 * a declaration supplies the query, its row shape and every table it watches
 * in one value (ADR-0005), so a joined table missing there is a failing check
 * rather than a stale screen.
 */
export function useLiveRead<Row extends object>(
  input: LiveReadDeclaration<Row> | LegacyLiveRead<Row>
): LiveReadResult<Row> {
  const database = useDatabase();
  const subscribe = useContext(SubscribeContext);

  if (!subscribe) {
    throw new Error('useLiveRead must be used inside <DatabaseProvider>.');
  }

  const { tables } = input;
  const read = 'read' in input ? input.read : undefined;
  const empty = 'empty' in input ? input.empty : undefined;
  const legacyRun = 'run' in input ? input.run : undefined;
  const run = useMemo(
    () => (read ? () => read(database) : legacyRun!),
    [database, read, legacyRun]
  );
  const tableKey = tables.map(liveReadTableName).join(',');
  const [result, setResult] = useState<LiveReadResult<Row>>({
    data: empty,
    error: undefined,
    status: 'loading',
  });

  useEffect(() => {
    let active = true;

    const refresh = () => {
      try {
        const data = run();

        if (active) setResult({ data, error: undefined, status: 'ready' });
      } catch (caught) {
        if (active) {
          setResult((current) => ({
            data: current.data,
            error: toError(caught),
            status: 'error',
          }));
        }
      }
    };

    refresh();

    const unsubscribe = subscribe(tableKey === '' ? [] : tableKey.split(','), refresh);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [run, subscribe, tableKey]);

  return result;
}

/**
 * Opens the catalog database once for the app and closes it on unmount.
 * Every screen reads the handle through `useDatabase` and subscribes through
 * `useLiveRead`.
 *
 * A rendered test supplies its own `database` and a synchronous `subscribe`;
 * an injected database belongs to the caller and is not closed here.
 */
export function DatabaseProvider({
  children,
  database: providedDatabase,
  subscribe: providedSubscribe,
}: PropsWithChildren<{ database?: Database; subscribe?: LiveReadSubscribe }>) {
  const [connection] = useState(() => {
    if (providedDatabase) {
      return {
        database: providedDatabase,
        subscribe: providedSubscribe ?? NO_SUBSCRIBE,
      };
    }

    return openAppDatabaseWithLiveReads();
  });

  useEffect(() => {
    if (providedDatabase) return;

    return () => connection.database.close();
  }, [connection, providedDatabase]);

  return (
    <SubscribeContext.Provider value={connection.subscribe}>
      <DatabaseContext.Provider value={connection.database}>{children}</DatabaseContext.Provider>
    </SubscribeContext.Provider>
  );
}

export function useDatabase(): Database {
  const database = useContext(DatabaseContext);

  if (!database) {
    throw new Error('useDatabase must be used inside <DatabaseProvider>.');
  }

  return database;
}
