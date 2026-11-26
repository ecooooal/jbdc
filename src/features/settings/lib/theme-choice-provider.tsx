import { createContext, useContext, useEffect, type PropsWithChildren } from "react";
import { Uniwind } from "uniwind";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { resolveThemeScheme, type ThemeChoice } from "./settings";
import { useThemeChoice } from "./use-theme-choice";

/** The appearance the app renders in, and the choice behind it. */
export type AppTheme = {
  /** The stored choice: a fixed mode, or the system's. */
  choice: ThemeChoice;
  /** The light or dark mode every surface renders in right now. */
  scheme: "light" | "dark";
  /** Persists a choice; the next render reports it. */
  setTheme: (theme: ThemeChoice) => void;
};

const AppThemeContext = createContext<AppTheme | null>(null);

/**
 * The one appearance the app renders in. The settings hook reads the stored
 * choice on its first render; this provider folds it with the system's scheme
 * for the navigation theme, and hands it to the styling engine so every
 * `className` surface follows it too. While the choice is follow-system the
 * engine follows the system on its own, including a change at sunrise.
 */
export function ThemeChoiceProvider({ children }: PropsWithChildren) {
  const { theme, setTheme } = useThemeChoice();
  const systemScheme = useColorScheme();
  const scheme = resolveThemeScheme(theme, systemScheme);

  useEffect(() => {
    Uniwind.setTheme(theme === "follow-system" ? "system" : theme);
  }, [theme]);

  return (
    <AppThemeContext.Provider value={{ choice: theme, scheme, setTheme }}>
      {children}
    </AppThemeContext.Provider>
  );
}

/** The app's appearance and the way to change it; requires the provider. */
export function useAppTheme(): AppTheme {
  const theme = useContext(AppThemeContext);

  if (!theme) {
    throw new Error("useAppTheme must be used inside <ThemeChoiceProvider>.");
  }

  return theme;
}
