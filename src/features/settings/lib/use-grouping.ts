import { useCallback, useState } from "react";
import { useDatabase } from "@/features/database/react";
import { createSettings, type Grouping } from "./settings";

export type GroupingState = {
  grouping: Grouping;
  /** Persists the choice; the next render reports it. */
  setGrouping: (grouping: Grouping) => void;
};

/**
 * The Library's grouping choice. The first render reads the persisted row
 * synchronously, so a stored choice is the state's first value; every change
 * writes through to `settings`.
 */
export function useGrouping(): GroupingState {
  const database = useDatabase();
  const [settings] = useState(() => createSettings(database));
  const [grouping, setGrouping] = useState(() => settings.grouping());

  const chooseGrouping = useCallback(
    (next: Grouping) => {
      settings.setGrouping(next);
      setGrouping(next);
    },
    [settings],
  );

  return { grouping, setGrouping: chooseGrouping };
}
