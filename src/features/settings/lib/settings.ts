import { eq } from "drizzle-orm";
import type { Database } from "@/features/database";
import { settings } from "@/features/database";

/** The Library's three card densities: one list row, two tiles, or four tiles. */
export const CARD_DENSITIES = [1, 2, 4] as const;

export type CardDensity = (typeof CARD_DENSITIES)[number];

/** Two per row until the owner chooses otherwise. */
export const DEFAULT_CARD_DENSITY: CardDensity = 2;

/** The Library's two groupings: the flat stream, or gathered under Collection. */
export const GROUPINGS = ["per-design", "per-collection"] as const;

export type Grouping = (typeof GROUPINGS)[number];

/** The flat stream until the owner chooses otherwise. */
export const DEFAULT_GROUPING: Grouping = "per-design";

/** The Owner's app-wide appearance: one fixed mode, or the system's. */
export const THEME_CHOICES = ["light", "dark", "follow-system"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** The system's appearance until the owner chooses otherwise. */
export const DEFAULT_THEME_CHOICE: ThemeChoice = "follow-system";

/** The one `settings` key card density occupies. */
const CARD_DENSITY_KEY = "library.cardDensity";

/** The one `settings` key grouping occupies. */
const GROUPING_KEY = "library.grouping";

/** The one `settings` key the theme choice occupies. */
const THEME_KEY = "appearance.theme";

export type Settings = {
  /** The owner's chosen Library density, or the default when none is stored. */
  cardDensity(): CardDensity;
  /** Stores the choice, replacing any previous one. */
  setCardDensity(density: CardDensity): void;
  /** The owner's chosen Library grouping, or the default when none is stored. */
  grouping(): Grouping;
  /** Stores the choice, replacing any previous one. */
  setGrouping(grouping: Grouping): void;
  /** The owner's chosen theme, or follow-system when none is stored. */
  theme(): ThemeChoice;
  /** Stores the choice, replacing any previous one. */
  setTheme(theme: ThemeChoice): void;
};

/**
 * The density a stored or control value names, or null when it names none.
 * Settings falls back to the default; the control simply ignores it.
 */
export function cardDensityFrom(value: string | undefined): CardDensity | null {
  const density = Number(value);

  return CARD_DENSITIES.find((candidate) => candidate === density) ?? null;
}

/**
 * The grouping a stored value names, or null when it names no choice.
 */
export function groupingFrom(value: string | undefined): Grouping | null {
  return GROUPINGS.find((candidate) => candidate === value) ?? null;
}

/**
 * The theme a stored value names, or null when it names no choice.
 */
export function themeChoiceFrom(value: string | undefined): ThemeChoice | null {
  return THEME_CHOICES.find((candidate) => candidate === value) ?? null;
}

/**
 * The appearance a choice and the system's current scheme resolve to: the
 * Owner's fixed choice when she made one, otherwise the system's. A system
 * with no preference reads as light, the page the archive is designed on.
 */
export function resolveThemeScheme(
  theme: ThemeChoice,
  systemScheme: "light" | "dark" | null | undefined,
): "light" | "dark" {
  if (theme !== "follow-system") return theme;

  return systemScheme === "dark" ? "dark" : "light";
}

/** The stored value under one key, or undefined when the preference is unset. */
function readSetting(database: Database, key: string): string | undefined {
  return database.db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .get()?.value;
}

/** Stores one preference, replacing the value under its key. */
function writeSetting(database: Database, key: string, value: string): void {
  database.db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

/**
 * Device-local preferences, stored one row per preference in `settings`.
 * A new instance reads the row, so a choice made in an earlier launch is
 * already in effect when the Library opens.
 */
export function createSettings(database: Database): Settings {
  return {
    cardDensity() {
      return cardDensityFrom(readSetting(database, CARD_DENSITY_KEY)) ?? DEFAULT_CARD_DENSITY;
    },

    setCardDensity(density) {
      writeSetting(database, CARD_DENSITY_KEY, String(density));
    },

    grouping() {
      return groupingFrom(readSetting(database, GROUPING_KEY)) ?? DEFAULT_GROUPING;
    },

    setGrouping(grouping) {
      writeSetting(database, GROUPING_KEY, grouping);
    },

    theme() {
      return themeChoiceFrom(readSetting(database, THEME_KEY)) ?? DEFAULT_THEME_CHOICE;
    },

    setTheme(theme) {
      writeSetting(database, THEME_KEY, theme);
    },
  };
}
