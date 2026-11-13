import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { openAppDatabase } from './expo';
import type { Database } from './lib/port';

const DatabaseContext = createContext<Database | null>(null);

/**
 * Opens the catalog database once for the app and closes it on unmount.
 * Every screen reads the handle through `useDatabase`.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const [database] = useState(openAppDatabase);

  useEffect(() => () => database.close(), [database]);

  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): Database {
  const database = useContext(DatabaseContext);

  if (!database) {
    throw new Error('useDatabase must be used inside <DatabaseProvider>.');
  }

  return database;
}
