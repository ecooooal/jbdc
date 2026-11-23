import { useCallback, useState } from "react";
import { useDatabase } from "@/features/database/react";
import { createSettings, type Grouping } from "./settings";

export type GroupingState = {
  grouping: Grouping;
  /** Persists the choice and updates the Library in the same render. */
  setGrouping: (grouping: Grouping) => void;
};

/**
 * The Library's grouping. The first render reads the persisted row
 * synchronously, so the grid never flashes Per design before the stored
 * choice arrives; every change writes through to `settings`.
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
