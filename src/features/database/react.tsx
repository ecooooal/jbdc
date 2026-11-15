import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { openAppDatabase, useLiveQuery as useDriverLiveQuery } from './expo';
import type { Database } from './lib/port';

/** The live-query bridge. A rendered test can inject a synchronous one. */
export type LiveQuery = typeof useDriverLiveQuery;

const DatabaseContext = createContext<Database | null>(null);
const LiveQueryContext = createContext<LiveQuery>(useDriverLiveQuery);

/**
 * Live-query support for feature packages. Re-exported through this entry so
 * screens and features never import a driver adapter themselves.
 */
export const useLiveQuery = ((query, deps) =>
  useContext(LiveQueryContext)(query, deps)) as LiveQuery;

/**
 * Opens the catalog database once for the app and closes it on unmount.
 * Every screen reads the handle through `useDatabase`.
 *
 * A rendered test supplies its own `database` and a synchronous `liveQuery`;
 * an injected database belongs to the caller and is not closed here.
 */
export function DatabaseProvider({
  children,
  database: providedDatabase,
  liveQuery = useDriverLiveQuery,
}: PropsWithChildren<{ database?: Database; liveQuery?: LiveQuery }>) {
  const [database] = useState(() => providedDatabase ?? openAppDatabase());

  useEffect(() => {
    if (providedDatabase) return;

    return () => database.close();
  }, [database, providedDatabase]);

  return (
    <LiveQueryContext.Provider value={liveQuery}>
      <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>
    </LiveQueryContext.Provider>
  );
}

export function useDatabase(): Database {
  const database = useContext(DatabaseContext);

  if (!database) {
    throw new Error('useDatabase must be used inside <DatabaseProvider>.');
  }

  return database;
}
