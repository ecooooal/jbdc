import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { openAppDatabaseWithLiveReads } from './expo';
import {
  liveReadTableName,
  type LiveReadSubscribe,
  type LiveReadTable,
} from './lib/live-read';
import type { Database } from './lib/port';

export type LiveReadStatus = 'loading' | 'ready' | 'error';

export type LiveReadResult<T> = {
  data: T | undefined;
  error: Error | undefined;
  status: LiveReadStatus;
};

const DatabaseContext = createContext<Database | null>(null);
const SubscribeContext = createContext<LiveReadSubscribe | null>(null);

const NO_SUBSCRIBE: LiveReadSubscribe = () => () => {};

function toError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught));
}

/**
 * Runs one live read and re-runs it whenever any table it declares changes.
 * The watched tables are part of the read's interface (ADR-0005): a joined
 * table that is missing here silently stops refreshing.
 */
export function useLiveRead<T>({
  tables,
  run,
}: {
  tables: readonly LiveReadTable[];
  run: () => T;
}): LiveReadResult<T> {
  const subscribe = useContext(SubscribeContext);

  if (!subscribe) {
    throw new Error('useLiveRead must be used inside <DatabaseProvider>.');
  }

  const tableKey = tables.map(liveReadTableName).join(',');
  const [result, setResult] = useState<LiveReadResult<T>>({
    data: undefined,
    error: undefined,
    status: 'loading',
  });

  useEffect(() => {
    let active = true;

    const read = () => {
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

    read();

    const unsubscribe = subscribe(tableKey === '' ? [] : tableKey.split(','), read);

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
