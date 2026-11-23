import { useCallback, useState } from "react";
import { useDatabase } from "@/features/database/react";
import { createSettings, type ThemeChoice } from "./settings";

export type ThemeChoiceState = {
  theme: ThemeChoice;
  /** Persists the choice and applies it in the same render. */
  setTheme: (theme: ThemeChoice) => void;
};

/**
 * The Owner's app-wide theme choice. The first render reads the persisted row
 * synchronously, so the app never flashes the system's appearance before a
 * stored choice arrives; every change writes through to `settings`.
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
