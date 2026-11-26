import { useCallback, useState } from "react";
import { useDatabase } from "@/features/database/react";
import { createSettings, type ThemeChoice } from "./settings";

export type ThemeChoiceState = {
  theme: ThemeChoice;
  /** Persists the choice; the next render reports it. */
  setTheme: (theme: ThemeChoice) => void;
};

/**
 * The Owner's app-wide theme choice. The first render reads the persisted row
 * synchronously, so a stored choice is the state's first value; every change
 * writes through to `settings`.
 */
export function useThemeChoice(): ThemeChoiceState {
  const database = useDatabase();
  const [settings] = useState(() => createSettings(database));
  const [theme, setTheme] = useState(() => settings.theme());

  const chooseTheme = useCallback(
    (next: ThemeChoice) => {
      settings.setTheme(next);
      setTheme(next);
    },
    [settings],
  );

  return { theme, setTheme: chooseTheme };
}
